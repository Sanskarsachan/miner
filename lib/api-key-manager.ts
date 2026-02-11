/**
 * API Key Manager
 * Handles API key selection, quota tracking, and usage logging
 * 
 * Features:
 * - Select best available API key (most quota remaining)
 * - Track daily usage per key
 * - Log API usage with school/extraction details
 * - Reset daily quotas at midnight UTC
 */

import { ObjectId, Db, Collection } from 'mongodb';
import { GeminiApiKey, ApiUsageLog, ApiKeySelection, ApiKeyStats } from './types-redesigned';

const DAILY_LIMIT_RPM = 20; // Requests per minute
const DAILY_LIMIT = DAILY_LIMIT_RPM * 1440; // ~28,800 per day
const USABLE_LIMIT = DAILY_LIMIT_RPM * 19; // Use 19, reserve 1 for safety

/**
 * Select the best available API key
 * Returns the key with most quota remaining
 * Filters out inactive/deleted keys
 */
export async function selectAvailableApiKey(db: Db): Promise<GeminiApiKey | null> {
  const apiKeysCollection = db.collection('gemini_api_keys');
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Get all active keys
  const keys = (await apiKeysCollection
    .find({
      is_active: true,
      is_deleted: false,
    })
    .toArray()) as any[];

  if (keys.length === 0) {
    return null;
  }

  // Filter and sort by quota remaining
  const availableKeys = keys
    .map((key) => {
      // Reset quota if it's a new day
      let quota = { ...key.quota };
      
      if (key.quota.reset_at) {
        const resetDate = new Date(key.quota.reset_at);
        if (resetDate < today) {
          quota.used_today = 0;
          quota.reset_at = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        }
      }
      
      return {
        ...key,
        quota,
        remaining: quota.daily_limit - quota.used_today,
      };
    })
    .filter((key) => key.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining);

  return availableKeys.length > 0 ? availableKeys[0] : null;
}

/**
 * Get API key by ID
 * Used after user selects from dropdown
 */
export async function getApiKey(db: Db, apiKeyId: ObjectId | string): Promise<GeminiApiKey | null> {
  const apiKeysCollection = db.collection('gemini_api_keys');
  
  const key = (await apiKeysCollection.findOne({
    _id: typeof apiKeyId === 'string' ? new ObjectId(apiKeyId) : apiKeyId,
    is_active: true,
    is_deleted: false,
  })) as any;

  return key || null;
}

/**
 * Get all available API keys with usage stats
 * For dropdown selection in UI
 */
export async function getAvailableApiKeys(db: Db): Promise<ApiKeySelection[]> {
  const apiKeysCollection = db.collection('gemini_api_keys');
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const keys = (await apiKeysCollection
    .find({
      is_active: true,
      is_deleted: false,
    })
    .toArray()) as any[];

  const availableKeys = keys
    .map((key) => {
      // Reset quota if it's a new day
      let usedToday = key.quota.used_today;
      const resetDate = new Date(key.quota.reset_at);
      
      if (resetDate < today) {
        usedToday = 0;
      }
      
      const remaining = key.quota.daily_limit - usedToday;
      const percentageUsed = Math.round((usedToday / key.quota.daily_limit) * 100);
      
      return {
        api_key_id: key._id,
        nickname: key.nickname,
        rpd_remaining: remaining,
        daily_limit: key.quota.daily_limit,
        percentage_used: percentageUsed,
      };
    })
    // Filter: Only show keys with more than 1 request remaining (keep 1 in reserve)
    .filter((key) => key.rpd_remaining > 1)
    // Sort by most quota available first
    .sort((a, b) => b.rpd_remaining - a.rpd_remaining);

  return availableKeys;
}

/**
 * Log API usage
 * Call after successful API request
 */
export async function logApiUsage(
  db: Db,
  apiKeyId: ObjectId,
  options: {
    extraction_id?: ObjectId;
    user_id: ObjectId | string;
    school_name?: string;
    file_name?: string;
    requests_count: number;
    tokens_used: number;
    prompt_tokens?: number;
    completion_tokens?: number;
    success: boolean;
    error_message?: string;
    estimated_cost_cents?: number;
  }
): Promise<void> {
  const apiKeysCollection = db.collection('gemini_api_keys');
  const usageLogsCollection = db.collection('api_usage_logs');
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Log the usage
  const usageLog: ApiUsageLog = {
    api_key_id: apiKeyId,
    extraction_id: options.extraction_id,
    user_id: options.user_id,
    school_name: options.school_name,
    file_name: options.file_name,
    date: now,
    requests_count: options.requests_count,
    tokens_used: options.tokens_used,
    prompt_tokens: options.prompt_tokens,
    completion_tokens: options.completion_tokens,
    success: options.success,
    error_message: options.error_message,
    estimated_cost_cents: options.estimated_cost_cents || 0,
  };
  
  await usageLogsCollection.insertOne(usageLog);
  
  // Update API key quota
  await apiKeysCollection.updateOne(
    { _id: apiKeyId },
    {
      $inc: {
        'quota.used_today': options.requests_count,
        'usage.total_requests': options.requests_count,
        'usage.total_tokens_used': options.tokens_used,
        'usage.estimated_cost_cents': options.estimated_cost_cents || 0,
      },
      $set: {
        last_used: now,
      },
    } as any
  );
}

/**
 * Reset daily quotas at midnight UTC
 * Call from cron job or scheduled task
 */
export async function resetDailyQuotas(db: Db): Promise<void> {
  const apiKeysCollection = db.collection('gemini_api_keys');
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  
  await apiKeysCollection.updateMany(
    {
      is_active: true,
      is_deleted: false,
    },
    {
      $set: {
        'quota.used_today': 0,
        'quota.reset_at': tomorrow,
      },
    }
  );
  
  console.log('[API Key Manager] Daily quotas reset');
}

/**
 * Get API key stats for dashboard
 */
export async function getApiKeyStats(db: Db, apiKeyId: ObjectId): Promise<ApiKeyStats | null> {
  const apiKeysCollection = db.collection('gemini_api_keys');
  const usageLogsCollection = db.collection('api_usage_logs');
  
  const apiKey = (await apiKeysCollection.findOne({
    _id: apiKeyId,
  })) as any;

  if (!apiKey) {
    return null;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Get today's usage
  const todayUsage = await usageLogsCollection
    .find({
      api_key_id: apiKeyId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    })
    .toArray() as any[];

  const todayRequests = todayUsage.reduce((sum, log) => sum + log.requests_count, 0);
  const todayTokens = todayUsage.reduce((sum, log) => sum + log.tokens_used, 0);
  
  // Get this month's usage
  const monthUsage = await usageLogsCollection
    .find({
      api_key_id: apiKeyId,
      date: {
        $gte: thisMonthStart,
      },
    })
    .toArray() as any[];

  const monthRequests = monthUsage.reduce((sum, log) => sum + log.requests_count, 0);
  const monthTokens = monthUsage.reduce((sum, log) => sum + log.tokens_used, 0);
  
  // Get schools using this key today
  const schoolsToday = await usageLogsCollection
    .aggregate([
      {
        $match: {
          api_key_id: apiKeyId,
          date: {
            $gte: today,
            $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: '$school_name',
          requests_count: { $sum: '$requests_count' },
        },
      },
      {
        $sort: { requests_count: -1 },
      },
    ])
    .toArray() as any[];

  const createdAt = new Date(apiKey.created_at);
  const daysSinceCreated = Math.floor((now.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000));
  
  return {
    api_key_id: apiKey._id,
    nickname: apiKey.nickname,
    is_active: apiKey.is_active,
    today: {
      requests_used: todayRequests,
      requests_remaining: Math.max(0, apiKey.quota.daily_limit - todayRequests),
      requests_limit: apiKey.quota.daily_limit,
      percentage_used: Math.round((todayRequests / apiKey.quota.daily_limit) * 100),
      tokens_used: todayTokens,
    },
    this_month: {
      requests_used: monthRequests,
      tokens_used: monthTokens,
      days_active: new Set(monthUsage.map((log) => log.date.toISOString().split('T')[0])).size,
    },
    all_time: {
      total_requests: apiKey.usage.total_requests,
      total_tokens: apiKey.usage.total_tokens_used,
      estimated_cost_cents: apiKey.usage.estimated_cost_cents,
      days_since_created: daysSinceCreated,
    },
    schools_today: schoolsToday.map((school) => ({
      school_name: school._id || 'Unknown',
      requests_count: school.requests_count,
    })),
    last_used: apiKey.last_used,
    created_at: apiKey.created_at,
  };
}

/**
 * Validate API key is still usable
 * Returns true if key has quota remaining
 */
export async function validateApiKey(db: Db, apiKeyId: ObjectId): Promise<boolean> {
  const apiKeysCollection = db.collection('gemini_api_keys');
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const key = (await apiKeysCollection.findOne({
    _id: apiKeyId,
    is_active: true,
    is_deleted: false,
  })) as any;

  if (!key) {
    return false;
  }

  // Check if quota needs reset
  let usedToday = key.quota.used_today;
  const resetDate = new Date(key.quota.reset_at);
  
  if (resetDate < today) {
    usedToday = 0;
  }
  
  // Check if quota available
  return usedToday < key.quota.daily_limit;
}
