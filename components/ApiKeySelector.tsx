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
}

export default function ApiKeySelector({
  value,
  onChange,
  disabled = false,
  showStats = true,
}: ApiKeySelectorProps) {
  const [apiKeys, setApiKeys] = useState<ApiKeySelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<ApiKeySelection | null>(null);

  useEffect(() => {
    loadAvailableKeys();
  }, []);

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
        setError(result.error || 'Failed to load API keys');
      }
    } catch (err) {
      setError('Failed to load API keys');
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
    return (
      <div className="border border-red-200 bg-red-50 p-4 rounded-xl flex gap-3 animate-in fade-in">
        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-red-900 text-sm font-medium">{error || 'No API keys available'}</p>
          <p className="text-red-700 text-xs mt-1">Please contact your administrator to add API keys.</p>
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
          className="mt-4 p-4 rounded-xl border-2 border-gradient animate-in fade-in slide-in-from-top-2 duration-300"
          style={{
            borderImage: 'linear-gradient(135deg, #603ac8 0%, #31225c 100%) 1',
            background: 'linear-gradient(135deg, rgba(96, 58, 200, 0.08) 0%, rgba(49, 34, 92, 0.04) 100%)',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-bold text-gray-900">{selectedKey.nickname}</h4>
                {selectedKey.rpd_remaining > 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
              <p className="text-xs text-gray-600 font-medium">
                <span className="text-green-600 font-bold">{selectedKey.rpd_remaining}</span>
                {' '}of{' '}
                <span className="text-gray-700 font-bold">{selectedKey.daily_limit}</span>
                {' '}requests remaining
              </p>
            </div>
            <div className="text-right">
              <Zap className="text-amber-500 h-5 w-5" />
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  selectedKey.percentage_used > 80
                    ? 'bg-gradient-to-r from-red-500 to-red-600'
                    : selectedKey.percentage_used > 50
                    ? 'bg-gradient-to-r from-yellow-500 to-amber-500'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500'
                }`}
                style={{
                  width: `${Math.max(selectedKey.percentage_used, 3)}%`,
                }}
              />
            </div>
            <div className="flex justify-between">
              <p
                className={`text-xs font-bold ${
                  selectedKey.percentage_used > 80
                    ? 'text-red-600'
                    : selectedKey.percentage_used > 50
                    ? 'text-amber-600'
                    : 'text-green-600'
                }`}
              >
                {selectedKey.percentage_used}% utilized
              </p>
              <p className="text-xs text-gray-500">Quota</p>
            </div>
          </div>

          {selectedKey.rpd_remaining === 0 && (
            <div className="mt-3 p-3 bg-red-50 border-l-4 border-red-500 rounded-l-md">
              <p className="text-red-800 text-xs font-medium flex items-center gap-2">
                <AlertCircle size={14} />
                No requests remaining. Switch to another API key.
              </p>
            </div>
          )}

          {selectedKey.rpd_remaining > 0 && selectedKey.percentage_used > 80 && (
            <div className="mt-3 p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded-l-md">
              <p className="text-yellow-800 text-xs font-medium flex items-center gap-2">
                <AlertCircle size={14} />
                Running low on quota. Consider switching keys soon.
              </p>
            </div>
          )}

          {selectedKey.rpd_remaining > 0 && selectedKey.percentage_used <= 50 && (
            <div className="mt-3 p-3 bg-green-50 border-l-4 border-green-500 rounded-l-md">
              <p className="text-green-800 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 size={14} />
                Plenty of quota available for extraction.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
