/**
 * aiService.js
 *
 * Classification strategy (in order of priority):
 *  1. Rule-based keyword engine (instant, always works, no API needed)
 *  2. Gemini AI (refines the result when available)
 *  3. If Gemini 429/error → rule-based result is used as-is (never "unclassified")
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// ─── VALID PRIORITIES ───────────────────────────────────────────────────────
const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];

// ─── RULE-BASED KEYWORD ENGINE ───────────────────────────────────────────────
// Each rule: { keywords[], category, priority }
// Rules are ordered by severity — first match wins.
const RULES = [
  // ── Critical emergencies first ─────────────────────────────────────────────
  {
    keywords: ['fire', 'burning', 'burnt', 'blaze', 'flame', 'smoke', 'arson', 'wildfire', 'gas leak', 'explosion', 'engulf'],
    category: 'Fire & Hazard',
    priority: 'critical',
  },
  {
    keywords: ['flood', 'flooded', 'waterlog', 'water logging', 'submerged', 'inundated', 'overflowing drain', 'sewage overflow'],
    category: 'Flooding',
    priority: 'critical',
  },
  {
    keywords: ['shooting', 'gunshot', 'bomb', 'blast', 'terror', 'riot', 'mob', 'stampede', 'murder', 'dead body', 'corpse', 'vehicle crash', 'fatal accident'],
    category: 'Safety',
    priority: 'critical',
  },

  // ── High priority ──────────────────────────────────────────────────────────
  {
    keywords: ['accident', 'injured', 'injury', 'bleeding', 'unconscious', 'medical emergency', 'ambulance needed', 'collapsed', 'fell', 'trapped'],
    category: 'Medical Emergency',
    priority: 'high',
  },
  {
    keywords: ['robbery', 'theft', 'stolen', 'attack', 'assault', 'weapon', 'gun', 'knife', 'threatening', 'suspicious person', 'violence', 'break in', 'burglary'],
    category: 'Safety',
    priority: 'high',
  },
  {
    keywords: ['electric shock', 'live wire', 'downed wire', 'power line down', 'electrocution', 'short circuit', 'transformer', 'sparking'],
    category: 'Utilities',
    priority: 'high',
  },
  {
    keywords: ['pothole', 'road cave in', 'road collapse', 'sinkhole', 'bridge damage', 'fallen tree', 'road blocked', 'major road damage'],
    category: 'Roads',
    priority: 'high',
  },
  {
    keywords: ['water supply', 'no water', 'water cut', 'pipe burst', 'burst pipe', 'main break', 'sewage spill', 'sewage leak'],
    category: 'Utilities',
    priority: 'high',
  },

  // ── Medium priority ────────────────────────────────────────────────────────
  {
    keywords: ['road damage', 'road crack', 'road repair', 'speed bump', 'broken road', 'traffic signal', 'traffic light', 'street light', 'street lamp', 'footpath', 'pavement', 'sidewalk'],
    category: 'Roads',
    priority: 'medium',
  },
  {
    keywords: ['garbage', 'waste dumping', 'trash', 'litter', 'open dump', 'waste pile', 'rubbish', 'debris', 'sewage smell', 'drainage blocked', 'blocked drain'],
    category: 'Sanitation',
    priority: 'medium',
  },
  {
    keywords: ['stray dog', 'stray animal', 'dog bite', 'animal menace', 'monkey', 'snake', 'pest', 'rat', 'rodent', 'mosquito', 'dengue'],
    category: 'Animals',
    priority: 'medium',
  },
  {
    keywords: ['power outage', 'power cut', 'no electricity', 'blackout', 'electricity failure', 'gas problem', 'water pipe'],
    category: 'Utilities',
    priority: 'medium',
  },
  {
    keywords: ['park', 'playground', 'public property', 'vandalism', 'graffiti', 'broken bench', 'statue', 'public toilet', 'damaged infrastructure'],
    category: 'Public Property',
    priority: 'medium',
  },
  {
    keywords: ['pollution', 'air quality', 'factory smoke', 'chemical', 'oil spill', 'toxic', 'contamination', 'hazardous'],
    category: 'Environment',
    priority: 'medium',
  },

  // ── Low priority ───────────────────────────────────────────────────────────
  {
    keywords: ['noise', 'loud', 'noise pollution', 'music', 'loud speaker', 'honking', 'construction noise', 'neighbour'],
    category: 'Noise',
    priority: 'low',
  },
  {
    keywords: ['encroachment', 'illegal parking', 'footpath blocked', 'hawker', 'vendor', 'shop encroach'],
    category: 'Infrastructure',
    priority: 'low',
  },
];

/**
 * Rule-based classifier — scans title + description for keywords.
 * Returns a result immediately, no API needed.
 * @param {string} title
 * @param {string} description
 * @returns {{ category: string, priority: string, isValid: boolean }}
 */
const ruleBasedClassify = (title = '', description = '') => {
  const text = `${title} ${description}`.toLowerCase();

  // Spam/test detection — very short and generic
  const combined = text.trim();
  if (combined.length < 5) return { category: 'unclassified', priority: 'medium', isValid: false };
  const spamPatterns = /^(test|asdf|hello|hi|dummy|sample|abc|123|qwerty|foo|bar)\s*$/;
  if (spamPatterns.test(combined)) return { category: 'unclassified', priority: 'medium', isValid: false };

  for (const rule of RULES) {
    if (rule.keywords.some(kw => text.includes(kw))) {
      return { category: rule.category, priority: rule.priority, isValid: true };
    }
  }

  // No keyword matched — it's still likely a valid civic issue, just uncategorized
  return { category: 'Infrastructure', priority: 'medium', isValid: true };
};

/**
 * Analyze a civic issue using Gemini AI, with rule-based fallback.
 * @param {string} title
 * @param {string} description
 * @param {string} [imageUrl] - base64 data URL
 * @returns {{ category: string, priority: string, isValid: boolean }}
 */
const analyzeIssue = async (title = '', description = '', imageUrl = null) => {
  // 1. Always compute rule-based result first — this is our guaranteed baseline
  const ruleResult = ruleBasedClassify(title, description);
  console.log(`📋 Rule-based: ${ruleResult.category} / ${ruleResult.priority}`);

  // 2. If no API key, return rule-based immediately
  if (!API_KEY || !genAI) {
    console.warn('Gemini API key missing — using rule-based classification.');
    return ruleResult;
  }

  // 3. Try Gemini to enhance the result
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const promptText = `
You are a civic issue analyst for a city reporting platform. Analyze the given civic issue and respond ONLY with a valid JSON object with exactly 3 keys:
1. "category": One of these strings — "Fire & Hazard", "Flooding", "Safety", "Roads", "Sanitation", "Utilities", "Environment", "Animals", "Noise", "Public Property", "Medical Emergency", "Infrastructure", or a similarly precise civic category.
2. "priority": Strictly one of: "low", "medium", "high", "critical".
3. "isValid": true if this is a genuine civic concern; false ONLY for clear spam/test junk.

CRITICAL PRIORITY RULES — these MUST be followed:
- Fire, explosion, gas leak, building collapse → ALWAYS "critical"
- Flooding, major accident, violence, live electrical wire → "high" or "critical"
- Road damage, garbage, power cut → "medium"
- Noise, minor encroachments → "low"

TITLE: ${title || ''}
DESCRIPTION: ${description || 'No description provided.'}
    `.trim();

    const contentPayload = [promptText];

    if (imageUrl && imageUrl.includes(';base64,')) {
      try {
        const parts = imageUrl.split(';base64,');
        if (parts.length === 2) {
          contentPayload.push({
            inlineData: {
              data: parts[1],
              mimeType: parts[0].replace('data:', ''),
            }
          });
        }
      } catch (_) { /* ignore image parse errors */ }
    }

    const result = await model.generateContent(contentPayload);
    let text = result.response.text().trim()
      .replace(/```json/g, '').replace(/```/g, '').trim();

    const firstBrace = text.indexOf('{');
    const lastBrace  = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace >= firstBrace) {
      text = text.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(text);
    const geminiCategory = (parsed.category || '').trim();
    const geminiPriority = (parsed.priority || '').toLowerCase().trim();
    const geminiIsValid  = parsed.isValid !== false;

    // 4. Validate Gemini output — if it returned garbage, fall back to rule-based
    const validCategory = geminiCategory.length > 1 && geminiCategory !== 'unclassified';
    const validPriority = VALID_PRIORITIES.includes(geminiPriority);

    // 5. Merge: use Gemini when valid, otherwise use rule-based per field
    return {
      category: validCategory ? geminiCategory : ruleResult.category,
      priority: validPriority ? geminiPriority : ruleResult.priority,
      isValid:  geminiIsValid,
    };

  } catch (err) {
    const is429 = err.message && (err.message.includes('429') || err.message.includes('quota') || err.message.includes('Too Many Requests'));
    if (is429) {
      console.warn('⚠️  Gemini quota exceeded — using rule-based classification (instant fallback).');
    } else {
      console.error('Gemini error — using rule-based fallback:', err.message);
    }
    // 6. Always return rule-based when Gemini fails — NEVER return "unclassified"
    return ruleResult;
  }
};

module.exports = { analyzeIssue, ruleBasedClassify };