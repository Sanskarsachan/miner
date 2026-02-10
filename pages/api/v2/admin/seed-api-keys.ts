/**
 * Admin Endpoint: Seed API Keys
 * POST /api/v2/admin/seed-api-keys
 * 
 * This endpoint seeds the database with initial API keys
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/db';

const SEED_KEYS = [
  { api_key: "AIzaSyBmpu3EEGThCVVb1RKTIpahoMNxCpIGD5o", nickname: "API1001" },
  { api_key: "AIzaSyCalCi-sd7CARrp-msZ8tJkNNxkawad4BI", nickname: "API1002" },
  { api_key: "AIzaSyASgyn9KJezJzu0rXTRIUgvsC2ZDhekAfY", nickname: "API1003" },
  { api_key: "AIzaSyCkqmf5dSNjKSDT-HSN7HOX1dzIZMsi-Ss", nickname: "API1004" },
  { api_key: "AIzaSyCt6x6AVDgR9UNcGeEPEEK1ONrpy97-2lU", nickname: "API1005" },
  { api_key: "AIzaSyCW5q4rbTdWyoeOo55WMO1EZYCs_GVjQ3I", nickname: "API1006" },
  { api_key: "AIzaSyBpYSmgh17uqMoDC1-mCrTE089DFPpMKxs", nickname: "API1007" },
  { api_key: "AIzaSyBz-zSoTt7WRTEPAho6LjdAdB_wnkEyuL0", nickname: "API1008" },
  { api_key: "AIzaSyCcLNeLF5xQDxBDMUz-yxQ4piTlEzydzpQ", nickname: "API1009" },
  { api_key: "AIzaSyDc63aN3RQr983kFJaJ1GkXk0rAUnjIkD4", nickname: "API1010" },
  { api_key: "AIzaSyDDsl79dTxAm4rdLpImeGyUMZKA0y0MqyU", nickname: "API1011" },
  { api_key: "AIzaSyAGAHQv_yf-89lhjjPCy7eISTgdCMZZw24", nickname: "API1012" },
  { api_key: "AIzaSyAe2n3CHFvtemI0GEXcGacqSgusZOtE1Ic", nickname: "API1013" },
  { api_key: "AIzaSyBEeyIN_F6t6OwQEI1po5WJOkl38Iy5SIg", nickname: "API1014" },
  { api_key: "AIzaSyCIahvw2VKNzT0sVD5p8IfPoxDyexWVqQs", nickname: "API1015" },
];

interface ApiResponse {
  success: boolean;
  message?: string;
  added?: number;
  failed?: number;
  errors?: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method Not Allowed',
    });
  }

  try {
    const db = await connectDB();
    const apiKeysCollection = db.collection('gemini_api_keys');

    let added = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const keyData of SEED_KEYS) {
      try {
        // Check if key already exists
        const existing = await apiKeysCollection.findOne({
          nickname: keyData.nickname,
          is_deleted: false,
        });

        if (existing) {
          failed++;
          errors.push(`${keyData.nickname} - Already exists`);
          continue;
        }

        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        const doc = {
          key: keyData.api_key,
          nickname: keyData.nickname,
          provider: 'gemini',
          created_at: now,
          updated_at: now,
          is_active: true,
          is_deleted: false,
          quota: {
            daily_limit: 28800,
            used_today: 0,
            reset_at: tomorrow,
          },
          usage: {
            total_requests: 0,
            total_tokens_used: 0,
            estimated_cost_cents: 0,
          },
          daily_usage: [],
        };

        await apiKeysCollection.insertOne(doc);
        added++;
        console.log(`[seed-api-keys] Added ${keyData.nickname}`);
      } catch (err) {
        failed++;
        errors.push(`${keyData.nickname} - ${err instanceof Error ? err.message : 'Unknown error'}`);
        console.error(`[seed-api-keys] Error adding ${keyData.nickname}:`, err);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Seeding complete: ${added} added, ${failed} failed`,
      added,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[seed-api-keys] Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
}
