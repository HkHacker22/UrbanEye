const Issue = require('../models/Issue');
const AdminAction = require('../models/AdminAction');
const { analyzeIssue, ruleBasedClassify } = require('../services/aiService');
const { assignDepartment } = require('../services/geoRouting');
const { awardKarma } = require('../services/karmaService');

const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];

// @route POST /api/issues
// @desc Create a new issue — responds instantly, AI analysis runs in background
exports.createIssue = async (req, res) => {
  try {
    const { title, description, location } = req.body;

    if (!title || !description || !location || !location.coordinates) {
      return res.status(400).json({ error: 'Missing required fields: title, description, or location.' });
    }

    const coords = location.coordinates.map(num => Number(num) || 0);

    // Rule-based classification runs synchronously (instant, no API) —
    // gives meaningful category/priority immediately, never "unclassified".
    const initialClassification = ruleBasedClassify(title, description);

    // Save to DB immediately with rule-based values
    const issueData = {
      ...req.body,
      category: initialClassification.category,
      priority: initialClassification.priority,
      reporterUid: req.body.reporterUid || null,
      reporterName: req.body.reporterName || 'Anonymous',
      reporterPhoto: req.body.reporterPhoto || '',
      location: { type: 'Point', coordinates: coords },
      assignedCenterName: 'Pending Assignment',
      assignedCenterType: 'Infrastructure',
      aiPending: true, // Gemini will refine in background
    };

    const savedIssue = await new Issue(issueData).save();

    // Award karma immediately (don't wait for AI)
    if (req.body.reporterUid) {
      awardKarma(req.body.reporterUid, 'NEW_REPORT', savedIssue._id.toString());
    }

    // Respond to client right away — user sees their issue immediately
    res.status(201).json(savedIssue);

    // === Background: Gemini AI refinement + geo-routing ===
    // analyzeIssue already uses rule-based as fallback if Gemini 429s/fails.
    (async () => {
      try {
        const analysis = await analyzeIssue(title, description, req.body.imageUrl);
        const aiCategory = analysis.category; // never 'unclassified' from analyzeIssue
        const aiPriority = VALID_PRIORITIES.includes(analysis.priority) ? analysis.priority : initialClassification.priority;

        const assignedFacility = await assignDepartment(coords, aiCategory);

        await Issue.findByIdAndUpdate(savedIssue._id, {
          category: aiCategory,
          priority: aiPriority,
          assignedCenterName: assignedFacility.name,
          assignedCenterType: assignedFacility.type,
          aiPending: false,
        });
        console.log(`✅ Classification done for ${savedIssue._id}: ${aiCategory} / ${aiPriority}`);
      } catch (bgErr) {
        console.error('Background classification failed:', bgErr.message);
        // Rule-based classification already applied — just clear the pending flag
        await Issue.findByIdAndUpdate(savedIssue._id, { aiPending: false });
      }
    })();

  } catch (error) {
    console.error('Issue creation error:', error);
    res.status(500).json({ error: 'Failed to submit report.', details: error.message });
  }
};

// @route GET /api/issues/:id
// @desc Get a single issue with full data (including imageUrl)
exports.getIssueById = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id).lean();
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    res.status(200).json(issue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @route GET /api/issues
// @desc List issues — sorted, limited, imageUrl excluded for performance
exports.getIssues = async (req, res) => {
  try {
    const issues = await Issue.aggregate([
      {
        $addFields: {
          statusWeight: {
            $switch: {
              branches: [
                { case: { $eq: ['$status', 'Pending'] },     then: 1 },
                { case: { $eq: ['$status', 'In-Progress'] }, then: 2 },
                { case: { $eq: ['$status', 'Resolved'] },    then: 3 },
              ],
              default: 4
            }
          },
          priorityWeight: {
            $switch: {
              branches: [
                { case: { $eq: ['$priority', 'critical'] }, then: 1 },
                { case: { $eq: ['$priority', 'high'] },     then: 2 },
                { case: { $eq: ['$priority', 'medium'] },   then: 3 },
                { case: { $eq: ['$priority', 'low'] },      then: 4 },
              ],
              default: 5
            }
          }
        }
      },
      { $sort: { statusWeight: 1, priorityWeight: 1, createdAt: -1 } },
      { $limit: 30 },
      {
        $project: {
          statusWeight: 0,
          priorityWeight: 0,
        }
      },
    ]);
    res.status(200).json(issues);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @route PATCH /api/issues/:id/status
// @desc Update the status of an issue (admin action)
exports.updateIssueStatus = async (req, res) => {
  try {
    const { status, adminUid, adminName } = req.body;
    const issue = await Issue.findByIdAndUpdate(
      req.params.id,
      { status },
      { returnDocument: 'after', runValidators: true }
    );
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    // Karma: award on Resolved, deduct on Rejected
    if (issue.reporterUid) {
      if (status === 'Resolved') awardKarma(issue.reporterUid, 'RESOLVED', issue._id.toString());
      if (status === 'Rejected') awardKarma(issue.reporterUid, 'REJECTED', issue._id.toString());
    }

    // Log admin action
    if (adminUid) {
      AdminAction.create({
        adminUid,
        adminName: adminName || 'Admin',
        action: 'STATUS_CHANGE',
        targetId: issue._id.toString(),
        targetType: 'issue',
        meta: { newStatus: status, issueTitle: issue.title }
      }).catch(() => {});
    }

    res.status(200).json(issue);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// @route PATCH /api/issues/:id/reassign
// @desc Manually assign an issue to a different authority center
exports.reassignIssue = async (req, res) => {
  try {
    const { assignedCenterName, assignedCenterType, adminUid, adminName } = req.body;
    if (!assignedCenterName || !assignedCenterType) {
      return res.status(400).json({ error: 'assignedCenterName and assignedCenterType are required' });
    }

    const issue = await Issue.findByIdAndUpdate(
      req.params.id,
      { assignedCenterName, assignedCenterType },
      { returnDocument: 'after', runValidators: true }
    );

    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    // Log admin action
    if (adminUid) {
      AdminAction.create({
        adminUid,
        adminName: adminName || 'Admin',
        action: 'MANUAL_REASSIGN',
        targetId: issue._id.toString(),
        targetType: 'issue',
        meta: { assignedCenterName, assignedCenterType }
      }).catch(() => {});
    }

    res.status(200).json(issue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @route PATCH /api/issues/:id/priority
// @desc Update the priority of an issue (admin action)
exports.updateIssuePriority = async (req, res) => {
  try {
    const { priority } = req.body;
    let newPriority = (priority || '').toLowerCase();
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    if (!validPriorities.includes(newPriority)) newPriority = 'medium';

    const issue = await Issue.findByIdAndUpdate(
      req.params.id,
      { priority: newPriority },
      { returnDocument: 'after', runValidators: true }
    );
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    res.status(200).json(issue);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// @route POST /api/issues/:id/upvote
// @desc Toggle upvote count — expects { direction: 1 } or { direction: -1 }
exports.upvoteIssue = async (req, res) => {
  try {
    const direction = req.body.direction === -1 ? -1 : 1;
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    issue.upvotes = Math.max(0, (issue.upvotes || 0) + direction);
    await issue.save();
    res.status(200).json(issue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @route GET /api/issues/stats
// @desc Get statistics for Admin Dashboard
exports.getIssueStats = async (req, res) => {
  try {
    const totalIssues = await Issue.countDocuments();
    const pendingCount = await Issue.countDocuments({ status: { $regex: /^pending$/i } });
    const inProgressCount = await Issue.countDocuments({ status: { $regex: /^in-progress$/i } });
    const resolvedCount = await Issue.countDocuments({ status: { $regex: /^resolved$/i } });
    const unreadCount = await Issue.countDocuments({ isReadByAdmin: false });
    
    res.status(200).json({ totalIssues, pendingCount, inProgressCount, resolvedCount, unreadCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @route DELETE /api/issues/:id
// @desc Delete an issue (admin action)
exports.deleteIssue = async (req, res) => {
  try {
    const { adminUid, adminName } = req.body || {};
    const issue = await Issue.findByIdAndDelete(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    // Log admin action
    if (adminUid) {
      AdminAction.create({
        adminUid,
        adminName: adminName || 'Admin',
        action: 'ISSUE_DELETED',
        targetId: req.params.id,
        targetType: 'issue',
        meta: { issueTitle: issue.title }
      }).catch(() => {});
    }

    res.status(200).json({ message: 'Issue deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/issues/search?q=...
exports.searchIssues = async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.json([]);

    const regex = new RegExp(query, 'i');
    const issues = await Issue.find({
      $or: [
        { title: regex },
        { description: regex },
        { category: regex },
        { address: regex }
      ]
    }).sort({ createdAt: -1 }).limit(10);

    res.json(issues);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/issues/:id/comments
exports.addComment = async (req, res) => {
  try {
    const { authorName, authorUid, photoURL, text } = req.body;
    if (!text) return res.status(400).json({ error: 'Comment text is required' });

    const issue = await Issue.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          comments: { authorName, authorUid, photoURL, text, createdAt: new Date() }
        }
      },
      { new: true }
    );

    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    res.status(201).json(issue.comments[issue.comments.length - 1]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @route PATCH /api/issues/:id/read
// @desc Mark an issue as read by admin
exports.markIssueAsRead = async (req, res) => {
  try {
    const issue = await Issue.findByIdAndUpdate(
      req.params.id,
      { isReadByAdmin: true },
      { new: true }
    );
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    res.status(200).json(issue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @route GET /api/issues/unread-count
// @desc Get just the count of unread issues
exports.getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Issue.countDocuments({ isReadByAdmin: false });
    res.status(200).json({ unreadCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
