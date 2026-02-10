/**
 * Get API Key Stats and Usage Details
 * GET /api/v2/api-keys/[id]/stats
 * 
 * Response includes:
 * - Today's usage and remaining quota
 * - This month's usage
 * - All-time stats
 * - Schools using this key today
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import { connectDB } from '@/lib/db';
import { getApiKeyStats } from '@/lib/api-key-manager';
import { ApiKeyStats } from '@/lib/types-redesigned';

interface ApiResponse {
  success: boolean;
  data?: ApiKeyStats;
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
    const keyId = req.query.id as string;

    if (!ObjectId.isValid(keyId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid API key ID',
      });
    }

    const db = await connectDB();
    const stats = await getApiKeyStats(db, new ObjectId(keyId));

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'API key not found',
      });
    }

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
