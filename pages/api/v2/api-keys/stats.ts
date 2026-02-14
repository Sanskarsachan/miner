/**
 * API Key Stats Endpoint
 * GET /api/v2/api-keys/stats
 * 
 * Returns current status of all API keys with quota information
 * Used by analytics dashboard
 * 
 * Response:
 * {
 *   success: boolean
 *   data: Array<{
 *     api_key_id: string
 *     nickname: string
 *     daily_limit: number
 *     rpd_remaining: number (requests per day remaining)
 *     rpd_used: number (requests per day used)
 *     percentage_used: number
 *     last_used: string (ISO date or 'Never')
 *     extraction_count: number (extractions using this key today)
 *   }>
 * }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import { connectDB } from '@/lib/db';

interface ApiKeyStats {
  api_key_id: string;
  nickname: string;
  daily_limit: number;
  rpd_remaining: number;
  rpd_used: number;
  percentage_used: number;
  last_used: string;
  extraction_count: number;
}

interface ApiResponse {
  success: boolean;
  data?: ApiKeyStats[];
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const db = await connectDB();
    const apiKeysCollection = db.collection('gemini_api_keys');
    const usageLogsCollection = db.collection('api_usage_logs');

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    // Get all active API keys
    const apiKeys = (await apiKeysCollection
      .find({
        is_active: true,
        is_deleted: false,
      })
      .toArray()) as any[];

    // Get usage logs for today
    const todayUsage = (await usageLogsCollection
      .find({
        date: {
          $gte: today,
          $lt: tomorrow,
        },
        success: true,
      })
      .toArray()) as any[];

    // Transform to stats format
    const stats: ApiKeyStats[] = apiKeys.map((key) => {
      // Reset quota if past reset time
      let usedToday = key.quota.used_today;
      const resetDate = new Date(key.quota.reset_at);

      if (resetDate < today) {
        usedToday = 0;
      }

      const dailyLimit = key.quota.daily_limit || 20;
      const rpd_used = usedToday;
      const rpd_remaining = dailyLimit - rpd_used;
      const percentage_used = Math.round((rpd_used / dailyLimit) * 100);

      // Count extractions using this key today
      const extractionCount = todayUsage.filter(
        (log) => log.api_key_id.toString() === key._id.toString()
      ).length;

      return {
        api_key_id: key._id.toString(),
        nickname: key.nickname,
        daily_limit: dailyLimit,
        rpd_remaining: Math.max(0, rpd_remaining),
        rpd_used,
        percentage_used,
        last_used: key.last_used ? new Date(key.last_used).toISOString() : 'Never',
        extraction_count: extractionCount,
      };
    });

    // Sort by nickname
    stats.sort((a, b) => a.nickname.localeCompare(b.nickname));

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('[api-keys/stats] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
