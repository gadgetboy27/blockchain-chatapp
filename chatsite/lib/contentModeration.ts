/**
 * AI-Powered Content Moderation System
 * Client-side content analysis and filtering
 */

// Content safety scores
export interface SafetyScore {
  overall: number;          // 0-100 (higher = safer)
  categories: {
    spam: number;
    harassment: number;
    hateSpeech: number;
    violence: number;
    sexualContent: number;
    selfHarm: number;
    misinformation: number;
  };
  shouldWarn: boolean;
  shouldHide: boolean;
  reasons: string[];
}

// User moderation level
export enum ModerationLevel {
  OFF = 0,           // See everything
  LOW = 3,           // Only hide extreme content
  MEDIUM = 5,        // Hide most harmful content
  HIGH = 7,          // Strict filtering
  MAXIMUM = 10       // Ultra-safe
}

/**
 * Analyze text content using multiple techniques
 */
export async function analyzeContent(
  text: string,
  userLevel: ModerationLevel = ModerationLevel.MEDIUM
): Promise<SafetyScore> {
  const scores = {
    spam: await detectSpam(text),
    harassment: await detectHarassment(text),
    hateSpeech: await detectHateSpeech(text),
    violence: await detectViolence(text),
    sexualContent: await detectSexualContent(text),
    selfHarm: await detectSelfHarm(text),
    misinformation: await detectMisinformation(text),
  };

  // Calculate overall safety score (0-100, higher is safer)
  const weights = {
    spam: 0.1,
    harassment: 0.2,
    hateSpeech: 0.25,
    violence: 0.2,
    sexualContent: 0.1,
    selfHarm: 0.1,
    misinformation: 0.05,
  };

  const overall = Object.entries(scores).reduce((acc, [key, score]) => {
    return acc + (100 - score) * weights[key as keyof typeof weights];
  }, 0);

  // Determine if content should be warned/hidden
  const threshold = getThresholdForLevel(userLevel);
  const shouldWarn = overall < threshold.warn;
  const shouldHide = overall < threshold.hide;

  const reasons: string[] = [];
  if (scores.spam > 70) reasons.push('Likely spam');
  if (scores.harassment > 70) reasons.push('Contains harassment');
  if (scores.hateSpeech > 70) reasons.push('Contains hate speech');
  if (scores.violence > 70) reasons.push('Contains violent content');
  if (scores.sexualContent > 70) reasons.push('Contains sexual content');
  if (scores.selfHarm > 70) reasons.push('Contains self-harm content');
  if (scores.misinformation > 70) reasons.push('Potential misinformation');

  return {
    overall,
    categories: scores,
    shouldWarn,
    shouldHide,
    reasons,
  };
}

/**
 * Detect spam using pattern matching and heuristics
 */
async function detectSpam(text: string): Promise<number> {
  let score = 0;

  // Repeated characters
  if (/(.)\1{5,}/.test(text)) score += 20;

  // Excessive caps
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (capsRatio > 0.7) score += 30;

  // Excessive punctuation
  const punctRatio = (text.match(/[!?]{3,}/g) || []).length;
  if (punctRatio > 0) score += 20;

  // Common spam phrases
  const spamPhrases = [
    'click here',
    'buy now',
    'limited time',
    'act now',
    'free money',
    'make money fast',
    'nigerian prince',
    'verify your account',
  ];

  const lowerText = text.toLowerCase();
  spamPhrases.forEach(phrase => {
    if (lowerText.includes(phrase)) score += 15;
  });

  // Excessive links
  const linkCount = (text.match(/https?:\/\//g) || []).length;
  if (linkCount > 3) score += 20;

  return Math.min(score, 100);
}

/**
 * Detect harassment using keyword matching and patterns
 */
async function detectHarassment(text: string): Promise<number> {
  let score = 0;
  const lowerText = text.toLowerCase();

  // Threatening language
  const threats = [
    'i will kill',
    'going to hurt',
    'watch your back',
    'you\'re dead',
    'find you',
    'doxx',
  ];

  threats.forEach(threat => {
    if (lowerText.includes(threat)) score += 40;
  });

  // Aggressive language
  const aggressive = ['stupid', 'idiot', 'moron', 'loser', 'pathetic'];
  aggressive.forEach(word => {
    if (lowerText.includes(word)) score += 10;
  });

  // Excessive anger indicators
  if (/[!]{3,}/.test(text)) score += 10;

  // Personal attacks
  if (lowerText.includes('you are') || lowerText.includes('you\'re')) {
    if (aggressive.some(word => lowerText.includes(word))) {
      score += 20;
    }
  }

  return Math.min(score, 100);
}

/**
 * Detect hate speech
 */
async function detectHateSpeech(text: string): Promise<number> {
  let score = 0;
  const lowerText = text.toLowerCase();

  // Note: This is a simplified version. Production systems should use ML models
  // like Perspective API, OpenAI Moderation API, or custom trained models

  // Racial slurs (censored list - production would be more comprehensive)
  const slurs = [
    'n****r',
    'f****t',
    'r****d',
    // Add more as needed, properly censored
  ];

  slurs.forEach(slur => {
    if (lowerText.includes(slur.replace(/\*/g, ''))) {
      score += 100; // Instant max score
    }
  });

  // Hate group references
  const hateGroups = ['nazi', 'kkk', 'white supremac', 'hitler'];
  hateGroups.forEach(group => {
    if (lowerText.includes(group)) score += 50;
  });

  // Dehumanizing language
  const dehumanizing = ['subhuman', 'vermin', 'pest', 'disease'];
  dehumanizing.forEach(word => {
    if (lowerText.includes(word)) score += 30;
  });

  return Math.min(score, 100);
}

/**
 * Detect violent content
 */
async function detectViolence(text: string): Promise<number> {
  let score = 0;
  const lowerText = text.toLowerCase();

  const violentWords = [
    'kill', 'murder', 'shoot', 'stab', 'bomb',
    'massacre', 'genocide', 'torture', 'execute',
  ];

  violentWords.forEach(word => {
    if (lowerText.includes(word)) score += 15;
  });

  // Graphic descriptions
  if (lowerText.includes('blood') || lowerText.includes('gore')) {
    score += 20;
  }

  // Weapon references
  const weapons = ['gun', 'knife', 'explosive', 'weapon', 'grenade'];
  weapons.forEach(weapon => {
    if (lowerText.includes(weapon)) score += 10;
  });

  return Math.min(score, 100);
}

/**
 * Detect sexual content
 */
async function detectSexualContent(text: string): Promise<number> {
  let score = 0;
  const lowerText = text.toLowerCase();

  // Explicit sexual terms (censored)
  const explicitTerms = [
    'porn', 'nude', 'naked', 'sex', 'xxx',
    // Add more as needed
  ];

  explicitTerms.forEach(term => {
    if (lowerText.includes(term)) score += 20;
  });

  // OnlyFans/adult service promotion
  if (lowerText.includes('onlyfans') || lowerText.includes('premium snap')) {
    score += 30;
  }

  return Math.min(score, 100);
}

/**
 * Detect self-harm content
 */
async function detectSelfHarm(text: string): Promise<number> {
  let score = 0;
  const lowerText = text.toLowerCase();

  const selfHarmIndicators = [
    'kill myself',
    'end it all',
    'not worth living',
    'better off dead',
    'suicide',
    'self harm',
    'cut myself',
  ];

  selfHarmIndicators.forEach(indicator => {
    if (lowerText.includes(indicator)) score += 50;
  });

  return Math.min(score, 100);
}

/**
 * Detect potential misinformation
 */
async function detectMisinformation(text: string): Promise<number> {
  let score = 0;
  const lowerText = text.toLowerCase();

  // Conspiracy theory keywords
  const conspiracyTerms = [
    'fake news',
    'deep state',
    'they don\'t want you to know',
    'wake up sheeple',
    'do your own research',
  ];

  conspiracyTerms.forEach(term => {
    if (lowerText.includes(term)) score += 20;
  });

  // Absolute claims without evidence
  if (/definitely|absolutely|certainly|100%|guaranteed/.test(lowerText)) {
    if (!/source|study|research|evidence/.test(lowerText)) {
      score += 10;
    }
  }

  return Math.min(score, 100);
}

/**
 * Use external AI API for advanced moderation (optional)
 */
export async function analyzeWithAI(text: string): Promise<SafetyScore> {
  // Option 1: OpenAI Moderation API
  try {
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ input: text }),
    });

    const data = await response.json();
    const result = data.results[0];

    return {
      overall: result.flagged ? 30 : 90,
      categories: {
        spam: 0,
        harassment: result.categories['harassment'] ? 80 : 10,
        hateSpeech: result.categories['hate'] ? 90 : 10,
        violence: result.categories['violence'] ? 85 : 10,
        sexualContent: result.categories['sexual'] ? 80 : 10,
        selfHarm: result.categories['self-harm'] ? 90 : 10,
        misinformation: 0,
      },
      shouldWarn: result.flagged,
      shouldHide: result.flagged && result.category_scores['violence'] > 0.8,
      reasons: Object.entries(result.categories)
        .filter(([_, value]) => value)
        .map(([key, _]) => `Contains ${key}`),
    };
  } catch (error) {
    console.error('AI moderation failed:', error);
    // Fallback to local analysis
    return analyzeContent(text);
  }
}

/**
 * Get thresholds based on user's moderation level
 */
function getThresholdForLevel(level: ModerationLevel): { warn: number; hide: number } {
  const thresholds = {
    [ModerationLevel.OFF]: { warn: 0, hide: 0 },
    [ModerationLevel.LOW]: { warn: 80, hide: 95 },
    [ModerationLevel.MEDIUM]: { warn: 60, hide: 80 },
    [ModerationLevel.HIGH]: { warn: 40, hide: 60 },
    [ModerationLevel.MAXIMUM]: { warn: 30, hide: 50 },
  };

  return thresholds[level];
}

/**
 * Check if IPFS hash is in banned list (for illegal content)
 */
export async function checkBannedContent(ipfsHash: string): Promise<boolean> {
  // Check against known hash database (CSAM, etc.)
  // This could be maintained by organizations like NCMEC, IWF

  try {
    // Example: Check against local database
    const bannedHashes = await fetch('/api/banned-hashes');
    const { hashes } = await bannedHashes.json();

    return hashes.includes(ipfsHash);
  } catch (error) {
    console.error('Failed to check banned content:', error);
    return false;
  }
}

/**
 * Hash-based content matching (for known illegal content)
 * Uses PhotoDNA or similar perceptual hashing
 */
export async function checkPerceptualHash(fileData: ArrayBuffer): Promise<boolean> {
  // In production, integrate with:
  // - Microsoft PhotoDNA
  // - Google CSAI Match
  // - Facebook PDQ/TMK hashing

  // For now, return false (not implemented)
  return false;
}

/**
 * Content filter that respects user preferences
 */
export function shouldHideContent(
  safetyScore: SafetyScore,
  userPreferences: any,
  communityFlags: number
): { hide: boolean; reason: string } {
  // Always hide if banned (illegal content)
  if (safetyScore.overall === 0) {
    return { hide: true, reason: 'Illegal content' };
  }

  // User's personal moderation level
  if (safetyScore.shouldHide) {
    return { hide: true, reason: safetyScore.reasons.join(', ') };
  }

  // Community moderation
  if (userPreferences.trustCommunityFlags && communityFlags >= 10) {
    return { hide: true, reason: 'Flagged by community' };
  }

  // Blocked users
  // (handled separately in UI)

  return { hide: false, reason: '' };
}

/**
 * Generate content warning message
 */
export function getContentWarning(safetyScore: SafetyScore): string {
  if (safetyScore.reasons.length === 0) {
    return 'This content may be sensitive';
  }

  return `Warning: ${safetyScore.reasons.join(', ')}. Click to view anyway.`;
}

/**
 * Resources for users who see harmful content
 */
export const supportResources = {
  selfHarm: {
    title: 'Need help?',
    message: 'If you or someone you know is struggling, help is available.',
    resources: [
      { name: 'National Suicide Prevention Lifeline', contact: '988 or 1-800-273-8255' },
      { name: 'Crisis Text Line', contact: 'Text HOME to 741741' },
      { name: 'International Association for Suicide Prevention', url: 'https://www.iasp.info/resources/Crisis_Centres/' },
    ],
  },
  harassment: {
    title: 'Being harassed?',
    message: 'You can block this user and report to community moderators.',
    resources: [
      { name: 'Block User', action: 'block' },
      { name: 'Flag Content', action: 'flag' },
    ],
  },
};
