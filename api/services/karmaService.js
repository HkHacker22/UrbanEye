const User = require('../models/User');

// Karma configuration — easy to adjust
const KARMA_CONFIG = {
  NEW_REPORT: { delta: +10, reason: 'Active Observer – new report submitted' },
  RESOLVED:   { delta: +50, reason: 'Community Impact – issue marked as resolved' },
  REJECTED:   { delta: -30, reason: 'Trust Penalty – report marked as rejected/spam' },
};

const TIERS = [
  { name: 'Novice Reporter',   min: 0,    max: 100,  color: 'gray',   emoji: '🌱' },
  { name: 'Active Citizen',    min: 101,  max: 500,  color: 'blue',   emoji: '🏙️' },
  { name: 'Neighborhood Hero', min: 501,  max: 1500, color: 'purple', emoji: '⭐' },
  { name: 'Civic Champion',    min: 1501, max: Infinity, color: 'gold', emoji: '🏆' },
];

const getTier = (points) => {
  const p = Math.max(0, points);
  const tier = TIERS.find(t => p >= t.min && p <= t.max) || TIERS[0];
  const nextTier = TIERS[TIERS.indexOf(tier) + 1] || null;
  return {
    ...tier,
    nextTier: nextTier ? nextTier.name : null,
    nextThreshold: nextTier ? nextTier.min : null,
    progress: nextTier ? Math.round(((p - tier.min) / (nextTier.min - tier.min)) * 100) : 100,
  };
};

/**
 * Award (or deduct) karma points for a user.
 * @param {string} uid - Firebase UID
 * @param {'NEW_REPORT'|'RESOLVED'|'REJECTED'} event - karma event key
 * @param {string} [issueId] - related issue ID for reference
 */
const awardKarma = async (uid, event, issueId = null) => {
  if (!uid) return;
  const config = KARMA_CONFIG[event];
  if (!config) return;

  try {
    const user = await User.findOne({ uid });
    if (!user) return;

    const newTotal = Math.max(0, (user.karmaPoints || 0) + config.delta);
    const { name: newTier } = getTier(newTotal);

    await User.findOneAndUpdate(
      { uid },
      {
        $set: { karmaTier: newTier, karmaPoints: newTotal },
        $push: {
          karmaLedger: {
            $each: [{ delta: config.delta, reason: config.reason, issueId, createdAt: new Date() }],
            $position: 0,
            $slice: 100,
          }
        }
      },
      { returnDocument: 'after' }
    );
  } catch (err) {
    console.error('Karma award failed:', err.message);
  }
};

module.exports = { awardKarma, getTier, KARMA_CONFIG, TIERS };
