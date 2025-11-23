/**
 * Moderated Content Component
 * Shows content with appropriate warnings/filters based on AI analysis and community flags
 */

import { useState, useEffect } from 'react';
import { AlertTriangle, Eye, EyeOff, Flag, Shield } from 'lucide-react';
import {
  analyzeContent,
  ModerationLevel,
  SafetyScore,
  shouldHideContent,
  getContentWarning,
  supportResources,
} from '../lib/contentModeration';

interface ModeratedContentProps {
  content: string;
  sender: string;
  userPreferences?: {
    moderationLevel: ModerationLevel;
    trustCommunityFlags: boolean;
    blockedUsers: string[];
  };
  communityFlags?: number;
  onFlag?: () => void;
  onBlock?: () => void;
}

export default function ModeratedContent({
  content,
  sender,
  userPreferences = {
    moderationLevel: ModerationLevel.MEDIUM,
    trustCommunityFlags: true,
    blockedUsers: [],
  },
  communityFlags = 0,
  onFlag,
  onBlock,
}: ModeratedContentProps) {
  const [safetyScore, setSafetyScore] = useState<SafetyScore | null>(null);
  const [showContent, setShowContent] = useState(false);
  const [analyzing, setAnalyzing] = useState(true);

  useEffect(() => {
    async function analyze() {
      setAnalyzing(true);
      const score = await analyzeContent(content, userPreferences.moderationLevel);
      setSafetyScore(score);
      setAnalyzing(false);

      // Auto-show safe content
      if (!score.shouldWarn && !score.shouldHide) {
        setShowContent(true);
      }
    }

    analyze();
  }, [content, userPreferences.moderationLevel]);

  // Check if user blocked this sender
  if (userPreferences.blockedUsers.includes(sender)) {
    return (
      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
        <div className="flex items-center space-x-2 text-gray-500">
          <EyeOff className="w-4 h-4" />
          <span className="text-sm">Content from blocked user</span>
        </div>
      </div>
    );
  }

  if (analyzing) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
      </div>
    );
  }

  if (!safetyScore) {
    return <div className="text-red-500">Failed to analyze content</div>;
  }

  // Determine if content should be hidden
  const { hide, reason } = shouldHideContent(safetyScore, userPreferences, communityFlags);

  if (hide && !showContent) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-300 dark:border-yellow-700">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">
              Content Hidden
            </h4>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
              {reason}
            </p>

            <div className="mt-3 flex items-center space-x-2">
              <button
                onClick={() => setShowContent(true)}
                className="text-sm px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                <Eye className="w-4 h-4 inline mr-1" />
                Show Anyway
              </button>

              {onFlag && (
                <button
                  onClick={onFlag}
                  className="text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  <Flag className="w-4 h-4 inline mr-1" />
                  Flag Content
                </button>
              )}

              {onBlock && (
                <button
                  onClick={onBlock}
                  className="text-sm px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Block User
                </button>
              )}
            </div>

            {/* Support resources for sensitive content */}
            {safetyScore.categories.selfHarm > 70 && (
              <SupportResourcesBox type="selfHarm" />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Content is safe enough to show, but may have warning
  return (
    <div className={safetyScore.shouldWarn ? 'relative' : ''}>
      {safetyScore.shouldWarn && !showContent && (
        <div className="mb-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-300 dark:border-orange-700">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <span className="text-sm text-orange-800 dark:text-orange-200">
              {getContentWarning(safetyScore)}
            </span>
            <button
              onClick={() => setShowContent(true)}
              className="ml-auto text-sm text-orange-600 dark:text-orange-400 hover:underline"
            >
              Show
            </button>
          </div>
        </div>
      )}

      {showContent && (
        <>
          <div className="prose dark:prose-invert max-w-none">
            {content}
          </div>

          {/* Community moderation info */}
          {communityFlags > 0 && (
            <div className="mt-2 flex items-center space-x-2 text-sm text-gray-500">
              <Flag className="w-3 h-3" />
              <span>{communityFlags} community member(s) flagged this</span>
            </div>
          )}

          {/* Safety score (for transparency) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
              <strong>Safety Score:</strong> {safetyScore.overall.toFixed(1)}/100
              <div className="mt-1 text-gray-600 dark:text-gray-400">
                {Object.entries(safetyScore.categories).map(([key, value]) => (
                  value > 30 && <div key={key}>{key}: {value.toFixed(0)}</div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SupportResourcesBox({ type }: { type: keyof typeof supportResources }) {
  const resource = supportResources[type];

  return (
    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-300 dark:border-blue-700">
      <h5 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center">
        <Shield className="w-4 h-4 mr-2" />
        {resource.title}
      </h5>
      <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">{resource.message}</p>
      <div className="mt-2 space-y-1">
        {resource.resources.map((res, idx) => (
          <div key={idx} className="text-sm text-blue-700 dark:text-blue-300">
            <strong>{res.name}:</strong>{' '}
            {res.contact && <span>{res.contact}</span>}
            {res.url && (
              <a href={res.url} target="_blank" rel="noopener noreferrer" className="underline">
                Visit website
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Moderation Settings Panel
 */
export function ModerationSettings({
  currentLevel,
  onLevelChange,
}: {
  currentLevel: ModerationLevel;
  onLevelChange: (level: ModerationLevel) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Content Moderation Preferences</h3>

      <div>
        <label className="block text-sm font-medium mb-2">Filtering Level</label>
        <div className="space-y-2">
          {Object.entries({
            [ModerationLevel.OFF]: {
              name: 'Off',
              desc: 'See everything (not recommended)',
            },
            [ModerationLevel.LOW]: {
              name: 'Low',
              desc: 'Only hide extreme content',
            },
            [ModerationLevel.MEDIUM]: {
              name: 'Medium',
              desc: 'Balanced filtering (recommended)',
            },
            [ModerationLevel.HIGH]: {
              name: 'High',
              desc: 'Strict filtering',
            },
            [ModerationLevel.MAXIMUM]: {
              name: 'Maximum',
              desc: 'Ultra-safe mode',
            },
          }).map(([level, { name, desc }]) => (
            <label key={level} className="flex items-start space-x-3 cursor-pointer">
              <input
                type="radio"
                name="moderation-level"
                value={level}
                checked={currentLevel === Number(level)}
                onChange={() => onLevelChange(Number(level) as ModerationLevel)}
                className="mt-1"
              />
              <div>
                <div className="font-medium">{name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-300 dark:border-blue-700">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center mb-2">
          <Shield className="w-4 h-4 mr-2" />
          How Moderation Works
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Content is analyzed using AI before display</li>
          <li>• Community members can flag harmful content</li>
          <li>• You control what you see - nothing is deleted from blockchain</li>
          <li>• Illegal content (CSAM, etc.) is always blocked</li>
          <li>• Your preferences are stored on-chain and portable</li>
        </ul>
      </div>

      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded border border-green-300 dark:border-green-700">
        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
          Why This Approach?
        </h4>
        <p className="text-sm text-green-800 dark:text-green-200">
          Unlike centralized platforms, we can't delete data from the blockchain. Instead, we give
          <strong> you</strong> the power to filter content based on your preferences. This preserves
          censorship resistance while protecting users from harmful content.
        </p>
      </div>
    </div>
  );
}
