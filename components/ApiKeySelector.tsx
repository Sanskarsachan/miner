/**
 * API Key Selector Dropdown - Professional & Beautiful
 * Shows available API keys with quota remaining and real-time stats
 */

import React, { useState, useEffect } from 'react';
import { ApiKeySelection } from '@/lib/types-redesigned';
import { AlertCircle, Zap, CheckCircle2, Key } from 'lucide-react';

interface ApiKeySelectorProps {
  value: string;
  onChange: (apiKeyId: string) => void;
  disabled?: boolean;
  showStats?: boolean;
  refreshTrigger?: number;
}

export default function ApiKeySelector({
  value,
  onChange,
  disabled = false,
  showStats = true,
  refreshTrigger = 0,
}: ApiKeySelectorProps) {
  const [apiKeys, setApiKeys] = useState<ApiKeySelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<ApiKeySelection | null>(null);

  useEffect(() => {
    loadAvailableKeys();
  }, []);

  // Re-fetch keys when refreshTrigger changes (e.g., after extraction completes)
  useEffect(() => {
    loadAvailableKeys();
  }, [refreshTrigger]);

  useEffect(() => {
    if (value && apiKeys.length > 0) {
      const key = apiKeys.find((k) => String(k.api_key_id) === value);
      setSelectedKey(key || null);
    }
  }, [value, apiKeys]);

  const loadAvailableKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/v2/api-keys/available');
      const result = await response.json();
      if (result.success) {
        setApiKeys(result.data || []);
        if (!value && result.data && result.data.length > 0) {
          onChange(result.data[0].api_key_id);
        }
      } else {
        const errorMsg = result.error || 'Failed to load API keys';
        if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('MongoDB')) {
          setError('Database connection failed. Check MongoDB setup in .env.local');
        } else {
          setError(errorMsg);
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      if (errMsg.includes('ECONNREFUSED') || errMsg.includes('MongoDB')) {
        setError('Database unavailable. Install MongoDB or fix connection.');
      } else {
        setError('Failed to load API keys');
      }
      console.error('Error loading API keys:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full">
        <style jsx>{`
          @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
          }
          .shimmer-loading {
            animation: shimmer 2s infinite;
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 1000px 100%;
          }
        `}</style>
        <div className="h-10 bg-gray-100 rounded-lg shimmer-loading" />
      </div>
    );
  }

  if (error || apiKeys.length === 0) {
    const isDbError = error && (error.includes('Database') || error.includes('MongoDB') || error.includes('connection'));
    return (
      <div className="border border-red-200 bg-red-50 p-4 rounded-xl flex gap-3 animate-in fade-in">
        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-red-900 text-sm font-medium">{error || 'No API keys available'}</p>
          {isDbError ? (
            <p className="text-red-700 text-xs mt-1">
              Run: <code className="bg-red-100 px-1 py-0.5 rounded">brew install mongodb-community && brew services start mongodb-community</code>
            </p>
          ) : (
            <p className="text-red-700 text-xs mt-1">Please contact your administrator to add API keys.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full">
      <style jsx>{`
        .select-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .api-key-select {
          width: 100%;
          appearance: none;
          padding: 11px 16px;
          padding-right: 40px;
          background-color: white;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          color: #1f2937;
          cursor: pointer;
          transition: all 0.2s ease;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%231f2937' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
        }
        .api-key-select:hover:not(:disabled) {
          border-color: #603ac8;
          background-color: #f8f7ff;
          box-shadow: 0 0 0 3px rgba(96, 58, 200, 0.1);
        }
        .api-key-select:focus {
          outline: none;
          border-color: #603ac8;
          box-shadow: 0 0 0 3px rgba(96, 58, 200, 0.15);
        }
        .api-key-select:disabled {
          background-color: #f3f4f6;
          color: #9ca3af;
          cursor: not-allowed;
          opacity: 0.6;
        }
        .select-icon {
          position: absolute;
          right: 12px;
          pointer-events: none;
          color: #603ac8;
        }
      `}</style>

      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <Key size={16} className="text-603ac8" />
          <label className="block text-sm font-semibold text-gray-700">
            Gemini API Key
          </label>
        </div>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="api-key-select"
        >
          <option value="">🔍 Select an API key...</option>
          {apiKeys.map((key) => {
            const statusIcon = key.rpd_remaining > 0 ? '✓' : '⚠';
            return (
              <option key={String(key.api_key_id)} value={String(key.api_key_id)}>
                {statusIcon} {key.nickname} ({key.rpd_remaining}/{key.daily_limit})
              </option>
            );
          })}
        </select>
      </div>

      {showStats && selectedKey && (
        <div
          className="mt-3 px-3 py-2 rounded-lg border animate-in fade-in"
          style={{
            borderColor:
              selectedKey.rpd_remaining === 0
                ? '#fecaca'
                : selectedKey.percentage_used > 80
                ? '#fde68a'
                : '#bbf7d0',
            background:
              selectedKey.rpd_remaining === 0
                ? '#fef2f2'
                : selectedKey.percentage_used > 80
                ? '#fffbeb'
                : '#f0fdf4',
          }}
        >
          <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
            {selectedKey.rpd_remaining > 0 ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            <span>{selectedKey.nickname}</span>
            <span>•</span>
            <span>
              {selectedKey.rpd_remaining}/{selectedKey.daily_limit} left
            </span>
            <span>•</span>
            <span>{selectedKey.percentage_used}% used</span>
          </div>
        </div>
      )}
    </div>
  );
}
