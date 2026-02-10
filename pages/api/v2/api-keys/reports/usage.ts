/**
 * API Usage Report Endpoint
 * GET /api/v2/api-keys/reports/usage
 * 
 * Query params:
 * - days: number (default 30) - how many days to look back
 * - api_key_id: string (optional) - filter by specific key
 * 
 * Returns:
 * - Daily breakdown of API usage
 * - Schools using each key
 * - Cost breakdown
 * - Trending data
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import { connectDB } from '@/lib/db';

interface UsageReport {
  period: string;
  total_requests: number;
  total_tokens: number;
  total_cost_cents: number;
  daily_breakdown: {
    date: string;
    requests: number;
    tokens: number;
    cost_cents: number;
    api_keys_used: {
      nickname: string;
      requests: number;
    }[];
  }[];
  school_breakdown: {
    school_name: string;
    requests: number;
    tokens: number;
    cost_cents: number;
  }[];
  api_key_breakdown: {
    api_key_id: string;
    nickname: string;
    requests: number;
    tokens: number;
    cost_cents: number;
  }[];
}

interface ApiResponse {
  success: boolean;
  data?: UsageReport;
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
    const usageLogsCollection = db.collection('api_usage_logs');
    const apiKeysCollection = db.collection('gemini_api_keys');

    const days = parseInt(req.query.days as string) || 30;
    const apiKeyIdFilter = req.query.api_key_id as string | undefined;

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Build filter
    const filter: any = {
      date: {
        $gte: startDate,
        $lte: now,
      },
    };

    if (apiKeyIdFilter && ObjectId.isValid(apiKeyIdFilter)) {
      filter.api_key_id = new ObjectId(apiKeyIdFilter);
    }

    // Get all usage logs for the period
    const usageLogs = (await usageLogsCollection
      .find(filter)
      .sort({ date: -1 })
      .toArray()) as any[];

    // Calculate totals
    const totalRequests = usageLogs.reduce((sum, log) => sum + log.requests_count, 0);
    const totalTokens = usageLogs.reduce((sum, log) => sum + log.tokens_used, 0);
    const totalCost = usageLogs.reduce((sum, log) => sum + (log.estimated_cost_cents || 0), 0);

    // Daily breakdown
    const dailyMap = new Map<string, any>();
    for (const log of usageLogs) {
      const date = new Date(log.date).toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          requests: 0,
          tokens: 0,
          cost_cents: 0,
          api_keys_used: {},
        });
      }

      const day = dailyMap.get(date);
      day.requests += log.requests_count;
      day.tokens += log.tokens_used;
      day.cost_cents += log.estimated_cost_cents || 0;

      // Track which API keys were used
      const keyNickname = log.api_key_nickname || 'Unknown';
      if (!day.api_keys_used[keyNickname]) {
        day.api_keys_used[keyNickname] = 0;
      }
      day.api_keys_used[keyNickname] += log.requests_count;
    }

    const dailyBreakdown = Array.from(dailyMap.values()).map((day) => ({
      date: day.date,
      requests: day.requests,
      tokens: day.tokens,
      cost_cents: day.cost_cents,
      api_keys_used: Object.entries(day.api_keys_used).map(([nickname, requests]) => ({
        nickname,
        requests: requests as number,
      })),
    }));

    // School breakdown
    const schoolMap = new Map<string, any>();
    for (const log of usageLogs) {
      const school = log.school_name || 'Unknown';
      if (!schoolMap.has(school)) {
        schoolMap.set(school, {
          school_name: school,
          requests: 0,
          tokens: 0,
          cost_cents: 0,
        });
      }

      const schoolData = schoolMap.get(school);
      schoolData.requests += log.requests_count;
      schoolData.tokens += log.tokens_used;
      schoolData.cost_cents += log.estimated_cost_cents || 0;
    }

    const schoolBreakdown = Array.from(schoolMap.values()).sort(
      (a, b) => b.requests - a.requests
    );

    // API key breakdown (with names)
    const keyMap = new Map<string, any>();
    for (const log of usageLogs) {
      const keyId = log.api_key_id.toString();
      if (!keyMap.has(keyId)) {
        keyMap.set(keyId, {
          api_key_id: keyId,
          nickname: log.api_key_nickname || 'Unknown',
          requests: 0,
          tokens: 0,
          cost_cents: 0,
        });
      }

      const keyData = keyMap.get(keyId);
      keyData.requests += log.requests_count;
      keyData.tokens += log.tokens_used;
      keyData.cost_cents += log.estimated_cost_cents || 0;
    }

    const apiKeyBreakdown = Array.from(keyMap.values()).sort(
      (a, b) => b.requests - a.requests
    );

    const report: UsageReport = {
      period: `Last ${days} days`,
      total_requests: totalRequests,
      total_tokens: totalTokens,
      total_cost_cents: totalCost,
      daily_breakdown: dailyBreakdown.reverse(), // Oldest first
      school_breakdown: schoolBreakdown,
      api_key_breakdown: apiKeyBreakdown,
    };

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('[api-keys/reports/usage] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
