import React, { useState } from 'react';
import { Download, Trash2, RefreshCw, Eye, Copy } from 'lucide-react';

interface ExtractionDetailProps {
  extraction: {
    _id: string;
    filename: string;
    total_courses: number;
    tokens_used: number;
    created_at: string;
    updated_at: string;
    status: 'pending' | 'completed' | 'failed';
    pages_processed?: number;
    current_version?: number;
    is_refined?: boolean;
  } | null;
  onRefresh?: () => void;
  onDelete?: () => void;
  onExport?: (format: 'csv' | 'json' | 'excel') => void;
}

export const ExtractionDetailCard: React.FC<ExtractionDetailProps> = ({
  extraction,
  onRefresh,
  onDelete,
  onExport,
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    metadata: true,
    stats: true,
    actions: true,
  });
  const [copied, setCopied] = useState<string | null>(null);

  if (!extraction) {
    return (
      <div className="w-full max-w-2xl mx-auto p-8 text-center">
        <div className="text-slate-400 mb-4">
          <Eye size={48} className="mx-auto opacity-50 mb-4" />
          <p className="text-lg">Select a file from the sidebar to view details</p>
        </div>
      </div>
    );
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleCopyId = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusBadge = () => {
    switch (extraction.status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">
            <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
            Completed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm font-medium">
            <span className="w-2 h-2 bg-yellow-600 rounded-full animate-pulse"></span>
            Processing
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm font-medium">
            <span className="w-2 h-2 bg-red-600 rounded-full"></span>
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 truncate" title={extraction.filename}>
              {extraction.filename}
            </h1>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {getStatusBadge()}
              {extraction.is_refined && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-sm font-medium">
                  ✨ Refined
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-blue-600">{extraction.total_courses}</div>
            <div className="text-sm text-gray-600">courses extracted</div>
          </div>
        </div>
      </div>

      {/* Metadata Section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleSection('metadata')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
        >
          <h2 className="font-semibold text-gray-900">File Information</h2>
          <span className={`text-gray-500 transition-transform ${expandedSections.metadata ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
        {expandedSections.metadata && (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-200">
            <InfoRow
              label="File ID"
              value={extraction._id}
              copyable
              onCopy={() => handleCopyId(extraction._id, 'file-id')}
              copied={copied === 'file-id'}
            />
            <InfoRow
              label="Created"
              value={formatDate(extraction.created_at)}
            />
            <InfoRow
              label="Last Updated"
              value={formatDate(extraction.updated_at)}
            />
            <InfoRow
              label="Version"
              value={`v${extraction.current_version || 1}`}
            />
          </div>
        )}
      </div>

      {/* Statistics Section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleSection('stats')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
        >
          <h2 className="font-semibold text-gray-900">Extraction Statistics</h2>
          <span className={`text-gray-500 transition-transform ${expandedSections.stats ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
        {expandedSections.stats && (
          <div className="px-4 pb-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <StatCard
                icon="📚"
                label="Total Courses"
                value={extraction.total_courses.toString()}
              />
              <StatCard
                icon="⚡"
                label="Tokens Used"
                value={extraction.tokens_used.toString()}
              />
              <StatCard
                icon="📄"
                label="Pages"
                value={extraction.pages_processed?.toString() || 'N/A'}
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions Section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleSection('actions')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
        >
          <h2 className="font-semibold text-gray-900">Actions</h2>
          <span className={`text-gray-500 transition-transform ${expandedSections.actions ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
        {expandedSections.actions && (
          <div className="px-4 pb-4 border-t border-gray-200 space-y-3">
            {/* Export Options */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Export</p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => onExport?.('csv')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition text-sm font-medium border border-green-200"
                >
                  <Download size={16} />
                  CSV
                </button>
                <button
                  onClick={() => onExport?.('json')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium border border-blue-200"
                >
                  <Download size={16} />
                  JSON
                </button>
                <button
                  onClick={() => onExport?.('excel')}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition text-sm font-medium border border-orange-200"
                >
                  <Download size={16} />
                  Excel
                </button>
              </div>
            </div>

            {/* Other Actions */}
            <div className="pt-3 border-t border-gray-200 space-y-2">
              <button
                onClick={onRefresh}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition font-medium border border-blue-200"
              >
                <RefreshCw size={16} />
                Refine (Coming Soon)
              </button>
              <button
                onClick={onDelete}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition font-medium border border-red-200"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface InfoRowProps {
  label: string;
  value: string;
  copyable?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, copyable, onCopy, copied }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm text-gray-600">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-900 max-w-xs truncate">{value}</span>
      {copyable && (
        <button
          onClick={onCopy}
          className="text-gray-400 hover:text-gray-600 transition"
          title="Copy to clipboard"
        >
          <Copy size={16} />
        </button>
      )}
      {copied && (
        <span className="text-xs text-green-600">✓ Copied</span>
      )}
    </div>
  </div>
);

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value }) => (
  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
    <div className="text-2xl mb-2">{icon}</div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
    <div className="text-xs text-gray-600 mt-1">{label}</div>
  </div>
);

export default ExtractionDetailCard;
