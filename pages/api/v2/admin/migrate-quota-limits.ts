/**
 * Migration Script: Fix API Key Daily Limits
 * Endpoint: POST /api/v2/admin/migrate-quota-limits
 * 
 * Updates all API keys from 28800 to 20 daily limit
 * This fixes the production database issue
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/db';

interface ApiResponse {
  success: boolean;
  message?: string;
  updatedCount?: number;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const db = await connectDB();
    const apiKeysCollection = db.collection('gemini_api_keys');

    // Update all API keys to have daily_limit: 20
    const result = await apiKeysCollection.updateMany(
      {
        is_deleted: false,
        'quota.daily_limit': { $ne: 20 }, // Only update if not already 20
      },
      {
        $set: {
          'quota.daily_limit': 20,
          'quota.used_today': 0, // Reset to start fresh
        },
      }
    );

    console.log('[migrate-quota-limits] Updated', result.modifiedCount, 'API keys');

    return res.status(200).json({
      success: true,
      message: `Successfully updated API key daily limits to 20/20`,
      updatedCount: result.modifiedCount,
    });
  } catch (error: any) {
    console.error('[migrate-quota-limits] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
