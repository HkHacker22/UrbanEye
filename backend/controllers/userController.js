const User = require('../models/User');
const AdminAction = require('../models/AdminAction');
const Issue = require('../models/Issue');
const { getTier } = require('../services/karmaService');

// POST /api/users/sync
// Upsert user from Firebase auth data on login
exports.syncUser = async (req, res) => {
  try {
    const { uid, displayName, email, photoURL } = req.body;
    if (!uid || !email) return res.status(400).json({ error: 'uid and email required' });

    // findOneAndUpdate with upsert — use new:true equivalent
    const user = await User.findOneAndUpdate(
      { uid },
      {
        $set: { displayName: displayName || '', photoURL: photoURL || '' },
        $setOnInsert: { uid, email },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    // Ensure email is set (handles existing docs that may lack it)
    if (!user.email) {
      user.email = email;
      await user.save();
    }

    const tierInfo = getTier(user.karmaPoints || 0);
    res.status(200).json({ ...user.toObject(), tierInfo });
  } catch (err) {
    console.error('syncUser error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/users/me/:uid
// Get citizen profile: karma, ledger, their own issues
// Auto-creates the user record if it doesn't exist yet, so the page never hard-errors.
exports.getMyProfile = async (req, res) => {
  try {
    const { uid } = req.params;

    // Upsert — create user if they don't exist (handles cases where syncUser failed on login)
    let user = await User.findOneAndUpdate(
      { uid },
      { $setOnInsert: { uid, email: `${uid}@unknown.local`, displayName: '', photoURL: '' } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    const myIssues = await Issue.find({ reporterUid: uid })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const tierInfo = getTier(user.karmaPoints || 0);

    res.status(200).json({ profile: user, tierInfo, myIssues });
  } catch (err) {
    console.error('getMyProfile error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/users/admin/:uid
// Get admin profile: their action log + triage stats
// Auto-creates the user record if missing.
exports.getAdminProfile = async (req, res) => {
  try {
    const { uid } = req.params;

    // Upsert — same defensive pattern as getMyProfile
    const user = await User.findOneAndUpdate(
      { uid },
      { $setOnInsert: { uid, email: `${uid}@unknown.local`, displayName: '', photoURL: '', role: 'admin' } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    const recentActions = await AdminAction.find({ adminUid: uid })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Triage stats
    const [totalTriaged, authoritiesOnboarded, issuesDeleted] = await Promise.all([
      AdminAction.countDocuments({ adminUid: uid, action: 'STATUS_CHANGE' }),
      AdminAction.countDocuments({ adminUid: uid, action: 'AUTHORITY_REGISTERED' }),
      AdminAction.countDocuments({ adminUid: uid, action: 'ISSUE_DELETED' }),
    ]);

    res.status(200).json({
      profile: user,
      recentActions,
      stats: { totalTriaged, authoritiesOnboarded, issuesDeleted },
    });
  } catch (err) {
    console.error('getAdminProfile error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/users/:uid/notifications
// Update admin notification preferences
exports.updateNotifications = async (req, res) => {
  try {
    const { uid } = req.params;
    const { notifyOnCritical, notifyOnNewReport } = req.body;
    const user = await User.findOneAndUpdate(
      { uid },
      { $set: { notifyOnCritical, notifyOnNewReport } },
      { returnDocument: 'after' }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// GET /api/users/notifications/:uid
// Get karma ledger notifications + unread count
exports.getNotifications = async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await User.findOne({ uid });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const lastSeen = user.lastNotificationsViewedAt || new Date(0);
    
    // Recent ledger entries
    const ledger = Array.isArray(user.karmaLedger) ? user.karmaLedger : [];
    const notifications = ledger.slice(0, 20).map(entry => {
      const entryObj = typeof entry.toObject === 'function' ? entry.toObject() : entry;
      return {
        ...entryObj,
        isNew: entry.createdAt > lastSeen
      };
    });

    const unreadCount = notifications.filter(n => n.isNew).length;

    res.status(200).json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/users/notifications/:uid/seen
// Update lastNotificationsViewedAt to now
exports.markNotificationsRead = async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await User.findOneAndUpdate(
      { uid },
      { $set: { lastNotificationsViewedAt: new Date() } },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ message: 'Notifications marked as seen' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
