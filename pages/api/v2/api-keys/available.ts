/**
 * Get Available API Keys for Selection
 * GET /api/v2/api-keys/available
 * 
 * Returns list of active API keys with quota remaining
 * Sorted by most quota available
 * 
 * Response:
 * {
 *   success: boolean
 *   data: ApiKeySelection[]
 * }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/db';
import { getAvailableApiKeys } from '@/lib/api-key-manager';
import { ApiKeySelection } from '@/lib/types-redesigned';

interface ApiResponse {
  success: boolean;
  data?: ApiKeySelection[];
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
    const availableKeys = await getAvailableApiKeys(db);

    return res.status(200).json({
      success: true,
      data: availableKeys,
    });
  } catch (error: any) {
    console.error('[api-keys/available] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
