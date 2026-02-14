/**
 * Advanced Migration Script: Fix API Key Daily Limits
 * Endpoint: POST /api/v2/admin/fix-api-quotas
 * 
 * Diagnoses and fixes API key quota issues
 * - Shows which keys have incorrect limits
 * - Updates all keys to 20/20
 * - Handles edge cases and resetDate
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/db';

interface MigrationReport {
  success: boolean;
  message?: string;
  diagnosis?: {
    totalKeys: number;
    keysWithWrongLimit: Array<{
      nickname: string;
      currentLimit: number;
      currentUsed: number;
    }>;
    keysWithCorrectLimit: number;
  };
  migration?: {
    updated: number;
    failed: number;
    error?: string;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MigrationReport>
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

    console.log('[fix-api-quotas] Starting diagnosis...');

    // Step 1: Get all active keys
    const allKeys = (await apiKeysCollection
      .find({ is_deleted: false })
      .toArray()) as any[];

    console.log(`[fix-api-quotas] Found ${allKeys.length} active keys`);

    // Step 2: Diagnose
    const keysWithWrongLimit = allKeys
      .filter((k) => k.quota?.daily_limit !== 20)
      .map((k) => ({
        nickname: k.nickname,
        currentLimit: k.quota?.daily_limit || 0,
        currentUsed: k.quota?.used_today || 0,
      }));

    console.log(
      `[fix-api-quotas] Found ${keysWithWrongLimit.length} keys with incorrect limits`
    );
    keysWithWrongLimit.forEach((k) => {
      console.log(
        `  - ${k.nickname}: ${k.currentUsed}/${k.currentLimit} (should be /20)`
      );
    });

    // Step 3: Migrate - Update each key individually for reliability
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    let updateCount = 0;
    let failCount = 0;

    for (const key of allKeys) {
      try {
        // Check if update is needed
        if (key.quota?.daily_limit !== 20) {
          await apiKeysCollection.updateOne(
            { _id: key._id },
            {
              $set: {
                'quota.daily_limit': 20,
                'quota.reset_at': tomorrow,
                // Keep used_today as is (don't reset it) so we track actual usage
                last_modified_at: now,
              },
            }
          );

          console.log(
            `[fix-api-quotas] Updated ${key.nickname}: ${key.quota?.daily_limit} -> 20`
          );
          updateCount++;
        }
      } catch (err) {
        console.error(`[fix-api-quotas] Failed to update ${key.nickname}:`, err);
        failCount++;
      }
    }

    console.log(
      `[fix-api-quotas] Migration complete: ${updateCount} updated, ${failCount} failed`
    );

    // Step 4: Verify
    const updatedKeys = (await apiKeysCollection
      .find({ is_deleted: false })
      .toArray()) as any[];

    const verifyWrongLimit = updatedKeys.filter(
      (k) => k.quota?.daily_limit !== 20
    ).length;

    if (verifyWrongLimit === 0) {
      console.log('[fix-api-quotas] ✅ Verification passed: All keys at 20/20');
    } else {
      console.log(
        '[fix-api-quotas] ⚠️ Verification failed: Still have keys with wrong limits'
      );
    }

    return res.status(200).json({
      success: verifyWrongLimit === 0,
      message:
        verifyWrongLimit === 0
          ? 'Successfully fixed all API key quotas to 20/20'
          : `Migration completed but ${verifyWrongLimit} keys still have incorrect limits`,
      diagnosis: {
        totalKeys: allKeys.length,
        keysWithWrongLimit,
        keysWithCorrectLimit: allKeys.length - keysWithWrongLimit.length,
      },
      migration: {
        updated: updateCount,
        failed: failCount,
      },
    });
  } catch (error: any) {
    console.error('[fix-api-quotas] Fatal error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      diagnosis: {
        totalKeys: 0,
        keysWithWrongLimit: [],
        keysWithCorrectLimit: 0,
      },
    });
  }
}
