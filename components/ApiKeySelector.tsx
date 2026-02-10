/**
 * API Key Selector Dropdown
 * Shows available API keys with quota remaining
 */

import React, { useState, useEffect } from 'react';
import { ApiKeySelection } from '@/lib/types-redesigned';
import { AlertCircle, Zap } from 'lucide-react';

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
      <div className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-600">
        Loading API keys...
      </div>
    );
  }

  if (error || apiKeys.length === 0) {
    return (
      <div className="border border-red-200 bg-red-50 p-3 rounded-md flex gap-2">
        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
        <p className="text-red-800 text-sm">{error || 'No API keys available'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">Select API Key</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Choose an API key...</option>
        {apiKeys.map((key) => (
          <option key={String(key.api_key_id)} value={String(key.api_key_id)}>
            {key.nickname} - {key.rpd_remaining} remaining
          </option>
        ))}
      </select>

      {showStats && selectedKey && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900">{selectedKey.nickname}</h4>
              <p className="text-xs text-blue-700 mt-1">
                {selectedKey.rpd_remaining} of {selectedKey.daily_limit} remaining today
              </p>
            </div>
            <Zap className="text-blue-600" size={18} />
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                selectedKey.percentage_used > 80
                  ? 'bg-red-500'
                  : selectedKey.percentage_used > 50
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{
                width: `${Math.max(selectedKey.percentage_used, 2)}%`,
              }}
            />
          </div>
          <p
            className={`text-xs mt-1 font-semibold ${
              selectedKey.percentage_used > 80
                ? 'text-red-600'
                : selectedKey.percentage_used > 50
                ? 'text-yellow-600'
                : 'text-green-600'
            }`}
          >
            {selectedKey.percentage_used}% utilized
          </p>
          {selectedKey.rpd_remaining === 0 && (
            <div className="mt-2 border border-red-200 bg-red-50 p-2 rounded flex gap-2">
              <AlertCircle className="h-3 w-3 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-red-800 text-xs">No requests left today. Choose another key.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
