/**
 * API Key Management Dashboard
 * Shows all API keys with stats and management controls
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { ApiKeyStats } from '@/lib/types-redesigned';

interface ApiKeyDashboardProps {
  onRefresh?: () => void;
}

interface ApiKey {
  _id: string;
  nickname: string;
  provider: string;
  is_active: boolean;
  created_at: string;
  last_used?: string;
  stats?: ApiKeyStats;
}

export default function ApiKeyDashboard({ onRefresh }: ApiKeyDashboardProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKeyInput, setNewKeyInput] = useState('');
  const [newNickname, setNewNickname] = useState('');
  const [showKey, setShowKey] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v2/api-keys');
      const result = await response.json();
      if (result.success) {
        setApiKeys(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddKey = async () => {
    if (!newKeyInput.trim() || !newNickname.trim()) {
      alert('Please enter both API key and nickname');
      return;
    }
    try {
      const response = await fetch('/api/v2/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: newKeyInput,
          nickname: newNickname,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setShowAddModal(false);
        setNewKeyInput('');
        setNewNickname('');
        loadApiKeys();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to add API key:', error);
      alert('Failed to add API key');
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/v2/api-keys/${keyId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        setDeletingId(null);
        loadApiKeys();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to delete API key:', error);
      alert('Failed to delete API key');
    }
  };

  const toggleKeyActive = async (keyId: string, currentState: boolean) => {
    try {
      const response = await fetch(`/api/v2/api-keys/${keyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: !currentState,
        }),
      });
      const result = await response.json();
      if (result.success) {
        loadApiKeys();
      }
    } catch (error) {
      console.error('Failed to update API key:', error);
    }
  };

  const formatDate = (dateStr: string | Date | undefined) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <div className="text-center p-4">Loading API keys...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">API Key Management</h2>
          <p className="text-sm text-gray-500">
            Manage Gemini API keys • 20 RPM per key
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
        >
          <Plus size={18} />
          Add API Key
        </button>
      </div>

      {showAddModal && (
        <div className="border border-blue-200 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-bold mb-2">Add New API Key</h3>
          <p className="text-sm text-gray-600 mb-4">Add a new Gemini API key to the pool</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nickname</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., Primary Key"
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">API Key</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Paste your Gemini API key here"
                  type={showKey === 'new' ? 'text' : 'password'}
                  value={newKeyInput}
                  onChange={(e) => setNewKeyInput(e.target.value)}
                />
                <button
                  onClick={() => setShowKey(showKey === 'new' ? null : 'new')}
                  className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  {showKey === 'new' ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewKeyInput('');
                  setNewNickname('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleAddKey}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                Add Key
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {apiKeys.length === 0 ? (
          <div className="border rounded-lg p-6 text-center">
            <AlertCircle className="mx-auto text-yellow-500 mb-2" size={32} />
            <p className="text-sm text-gray-600">No API keys added yet.</p>
          </div>
        ) : (
          apiKeys.map((key) => (
            <div key={key._id} className={`border rounded-lg p-6 ${!key.is_active ? 'opacity-60' : ''}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold">{key.nickname}</h3>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        key.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {key.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">Created {formatDate(key.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleKeyActive(key._id, key.is_active)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100"
                  >
                    {key.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => setDeletingId(key._id)}
                    className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} className="text-blue-600" />
                    <span className="text-sm font-medium">Today</span>
                  </div>
                  <p className="text-2xl font-bold">{key.stats?.today.requests_used || 0}</p>
                  <p className="text-xs text-gray-600">
                    {key.stats?.today.requests_remaining || 0} remaining
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={16} className="text-purple-600" />
                    <span className="text-sm font-medium">This Month</span>
                  </div>
                  <p className="text-2xl font-bold">{key.stats?.this_month.requests_used || 0}</p>
                  <p className="text-xs text-gray-600">{key.stats?.this_month.days_active || 0} days</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={16} className="text-green-600" />
                    <span className="text-sm font-medium">Total</span>
                  </div>
                  <p className="text-2xl font-bold">{key.stats?.all_time.total_requests || 0}</p>
                  <p className="text-xs text-gray-600">
                    ${((key.stats?.all_time.estimated_cost_cents || 0) / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {deletingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-bold mb-2">Delete API Key</h3>
            <p className="text-sm text-gray-600 mb-6">Confirm deletion of this key?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => deletingId && handleDeleteKey(deletingId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
