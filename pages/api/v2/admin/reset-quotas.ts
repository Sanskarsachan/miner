/**
 * Admin Endpoint: Reset All API Key Quotas
 * POST /api/v2/admin/reset-quotas
 * 
 * Resets used_today to 0 for all keys (for local debugging)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await connectDB();
    const apiKeysCollection = db.collection('gemini_api_keys');

    // Check how many keys exist
    const count = await apiKeysCollection.countDocuments({});
    console.log('[reset-quotas] Total keys in collection:', count);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    //RPM = 20, so 20 * 1440 minutes = 28,800 per day
    const DAILY_LIMIT = 28800;
    
    const result = await apiKeysCollection.updateMany(
      {},
      {
        $set: {
          'quota.daily_limit': DAILY_LIMIT,
          'quota.used_today': 0,
          'quota.reset_at': tomorrow,
          is_active: true,
          is_deleted: false,
        }
      }
    );

    console.log('[reset-quotas] Matched:', result.matchedCount, 'Modified:', result.modifiedCount);

    return res.status(200).json({
      success: true,
      message: `Reset quotas for ${result.modifiedCount} keys (matched: ${result.matchedCount}, total: ${count})`,
      modified: result.modifiedCount,
      matched: result.matchedCount,
      total: count,
    });
  } catch (error) {
    console.error('[reset-quotas] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
