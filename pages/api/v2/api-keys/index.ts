/**
 * API Endpoint: Manage Gemini API Keys
 * POST /api/v2/api-keys - Create/Add new API key
 * GET /api/v2/api-keys - List all API keys with stats
 * PUT /api/v2/api-keys/[id] - Update API key (nickname, active status)
 * DELETE /api/v2/api-keys/[id] - Soft delete API key
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import { connectDB } from '@/lib/db';
import { getApiKeyStats } from '@/lib/api-key-manager';
import { GeminiApiKey, ApiKeyStats } from '@/lib/types-redesigned';
import crypto from 'crypto';

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Encrypt API key for storage
 * In production, use proper encryption (AWS KMS, etc.)
 */
function encryptApiKey(key: string): string {
  // For now, just store as-is
  // TODO: Implement proper encryption
  return key;
}

/**
 * Decrypt API key for use
 */
function decryptApiKey(encrypted: string): string {
  // TODO: Implement proper decryption
  return encrypted;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const { method } = req;

  try {
    const db = await connectDB();
    const apiKeysCollection = db.collection('gemini_api_keys');

    // GET - List all API keys
    if (method === 'GET') {
      const keys = (await apiKeysCollection
        .find({
          is_deleted: false,
        })
        .sort({ created_at: -1 })
        .toArray()) as any[];

      // Get stats for each key
      const keysWithStats = await Promise.all(
        keys.map(async (key) => {
          const stats = await getApiKeyStats(db, key._id);
          return {
            _id: key._id,
            nickname: key.nickname,
            provider: key.provider,
            is_active: key.is_active,
            created_at: key.created_at,
            last_used: key.last_used,
            stats,
          };
        })
      );

      return res.status(200).json({
        success: true,
        data: keysWithStats,
      });
    }

    // POST - Create new API key
    if (method === 'POST') {
      const { api_key, nickname } = req.body;

      if (!api_key || !nickname) {
        return res.status(400).json({
          success: false,
          error: 'api_key and nickname are required',
        });
      }

      // Check if nickname already exists
      const existing = await apiKeysCollection.findOne({
        nickname: nickname.trim(),
        is_deleted: false,
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Nickname already exists',
        });
      }

      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      const newKey: GeminiApiKey = {
        key: encryptApiKey(api_key),
        nickname: nickname.trim(),
        provider: 'gemini',
        created_at: now,
        updated_at: now,
        is_active: true,
        is_deleted: false,
        quota: {
          daily_limit: 28800, // 20 RPM * 1440 minutes
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

      const result = await apiKeysCollection.insertOne(newKey);

      return res.status(201).json({
        success: true,
        data: {
          _id: result.insertedId,
          nickname: newKey.nickname,
          created_at: newKey.created_at,
        },
      });
    }

    // PUT - Update API key (nickname, active status)
    if (method === 'PUT') {
      const keyId = req.query.id as string;
      const { nickname, is_active } = req.body;

      if (!ObjectId.isValid(keyId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid API key ID',
        });
      }

      const updates: any = {
        updated_at: new Date(),
      };

      if (nickname !== undefined) {
        updates.nickname = nickname.trim();
      }
      if (is_active !== undefined) {
        updates.is_active = is_active;
      }

      const result = await apiKeysCollection.updateOne(
        {
          _id: new ObjectId(keyId),
          is_deleted: false,
        },
        { $set: updates }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          error: 'API key not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          _id: keyId,
          updated: result.modifiedCount > 0,
        },
      });
    }

    // DELETE - Soft delete API key
    if (method === 'DELETE') {
      const keyId = req.query.id as string;

      if (!ObjectId.isValid(keyId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid API key ID',
        });
      }

      const result = await apiKeysCollection.updateOne(
        {
          _id: new ObjectId(keyId),
          is_deleted: false,
        },
        {
          $set: {
            is_deleted: true,
            is_active: false,
            updated_at: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          error: 'API key not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          deleted: true,
        },
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  } catch (error: any) {
    console.error('[api-keys] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
