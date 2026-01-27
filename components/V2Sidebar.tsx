import React, { useState, useEffect } from 'react';
import { Trash2, Download, Eye } from 'lucide-react';

interface Extraction {
  _id: string;
  filename: string;
  total_courses: number;
  created_at: string;
  updated_at: string;
  status: 'pending' | 'completed' | 'failed';
  tokens_used: number;
}

interface V2SidebarProps {
  onSelectFile?: (file: Extraction) => void;
  selectedFileId?: string;
}

export const V2Sidebar: React.FC<V2SidebarProps> = ({ onSelectFile, selectedFileId }) => {
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Fetch user's extractions
  useEffect(() => {
    fetchExtractions();
  }, []);

  const fetchExtractions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v2/extractions/list?limit=50&skip=0');
      const data = await response.json();
      
      if (data.success) {
        setExtractions(data.data || []);
      } else {
        setError('Failed to load extractions');
      }
    } catch (err) {
      setError('Error fetching extractions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (extractionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this extraction?')) {
      return;
    }

    try {
      setDeleting(extractionId);
      const response = await fetch(`/api/v2/extractions/${extractionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setExtractions(extractions.filter(e => e._id !== extractionId));
        if (selectedFileId === extractionId) {
          onSelectFile?.(null as any);
        }
      } else {
        alert('Failed to delete extraction');
      }
    } catch (err) {
      alert('Error deleting extraction');
      console.error(err);
    } finally {
      setDeleting(extractionId);
    }
  };

  const handleDownload = async (extraction: Extraction, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // Create CSV data
      const headers = ['Course Code', 'Course Name', 'Details', 'Confidence'];
      const rows = extraction.total_courses > 0 ? [headers] : [headers];
      
      const csvContent = rows.map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${extraction.filename}_courses.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Error downloading file');
      console.error(err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="w-full max-w-md h-full bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col border-r border-slate-700">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-xs font-bold">
            DB
          </div>
          Your Extractions
        </h2>
        <p className="text-xs text-slate-400 mt-1">{extractions.length} files</p>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-slate-400">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            Loading files...
          </div>
        ) : error ? (
          <div className="p-4">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={fetchExtractions}
              className="mt-2 text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded transition"
            >
              Retry
            </button>
          </div>
        ) : extractions.length === 0 ? (
          <div className="p-4 text-center text-slate-400">
            <p className="text-sm">No extractions yet</p>
            <p className="text-xs mt-2 opacity-75">Extract a PDF to get started</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {extractions.map((extraction) => (
              <button
                key={extraction._id}
                onClick={() => onSelectFile?.(extraction)}
                className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                  selectedFileId === extraction._id
                    ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20'
                    : 'bg-slate-700 border-slate-600 hover:border-blue-500 hover:bg-slate-650'
                }`}
              >
                {/* Filename */}
                <div className="font-medium text-sm truncate" title={extraction.filename}>
                  {extraction.filename}
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2 mt-1 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(extraction.status)}`}>
                    {extraction.status}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 mb-2">
                  <div>📚 {extraction.total_courses} courses</div>
                  <div>⚡ {extraction.tokens_used} tokens</div>
                </div>

                {/* Date */}
                <div className="text-xs text-slate-400">
                  {formatDate(extraction.updated_at || extraction.created_at)}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-2 pt-2 border-t border-slate-600">
                  <button
                    onClick={(e) => handleDownload(extraction, e)}
                    className="flex-1 flex items-center justify-center gap-1 text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded transition"
                    title="Download as CSV"
                  >
                    <Download size={14} />
                    Download
                  </button>
                  <button
                    onClick={(e) => handleDelete(extraction._id, e)}
                    disabled={deleting === extraction._id}
                    className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 disabled:opacity-50 transition"
                    title="Delete extraction"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-700 bg-slate-900">
        <button
          onClick={fetchExtractions}
          className="w-full text-xs bg-slate-700 hover:bg-slate-600 py-1.5 rounded transition text-slate-200"
        >
          Refresh
        </button>
      </div>
    </div>
  );
};

export default V2Sidebar;
