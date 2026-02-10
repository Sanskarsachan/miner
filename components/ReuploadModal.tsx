import React, { useState } from 'react';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';

interface ReuploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  extractionId: string;
  currentFilename: string;
  onSuccess?: () => void;
}

export default function ReuploadModal({
  isOpen,
  onClose,
  extractionId,
  currentFilename,
  onSuccess,
}: ReuploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [mergeMode, setMergeMode] = useState<'merge' | 'replace'>('merge');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('extractionId', extractionId);
      formData.append('mergeMode', mergeMode);

      const response = await fetch('/api/v2/extractions/reupload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Failed to reupload file`);
      }

      if (!data.success) {
        throw new Error(data.error || data.message || 'Failed to reupload file');
      }

      setSuccess(true);
      setLoading(false);
      
      // Show success for 2 seconds, then close
      setTimeout(() => {
        onSuccess?.();
        onClose();
        setFile(null);
        setSuccess(false);
        setMergeMode('merge');
        setError(null);
      }, 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error uploading file';
      setError(errorMsg);
      setLoading(false);
    }
  };

  return (
    <>
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: fadeIn 0.2s ease-in;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .modal {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          padding: 32px;
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        .modal-title {
          font-size: 24px;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }
        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }
        .close-btn:hover {
          color: #374151;
        }
        .file-input-wrapper {
          margin-bottom: 24px;
        }
        .file-input-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 10px;
        }
        .file-drop-zone {
          border: 2px dashed #d1d5db;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: #f9fafb;
        }
        .file-drop-zone:hover {
          border-color: #9ca3af;
          background: #f3f4f6;
        }
        .file-drop-zone.has-file {
          border-color: #10b981;
          background: #ecfdf5;
        }
        .upload-icon {
          color: #6b7280;
          margin-bottom: 12px;
          display: flex;
          justify-content: center;
        }
        .file-drop-zone.has-file .upload-icon {
          color: #10b981;
        }
        .file-name {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          margin-top: 8px;
        }
        .mode-selector {
          margin-bottom: 24px;
        }
        .mode-label {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 12px;
          display: block;
        }
        .mode-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .mode-option {
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
        }
        .mode-option:hover {
          border-color: #603AC8;
        }
        .mode-option.active {
          border-color: #603AC8;
          background: #F4F0FF;
        }
        .mode-option input[type="radio"] {
          margin-bottom: 8px;
          cursor: pointer;
          accent-color: #603AC8;
        }
        .mode-option-title {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          margin: 8px 0 4px;
          text-align: left;
        }
        .mode-option-desc {
          font-size: 12px;
          color: #6b7280;
          text-align: left;
        }
        .alert {
          padding: 12px 16px;
          border-radius: 10px;
          margin-bottom: 20px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
          font-size: 14px;
        }
        .alert-error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }
        .alert-success {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }
        .button-group {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }
        .btn {
          flex: 1;
          padding: 12px 16px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }
        .btn-secondary:hover:not(:disabled) {
          background: #e5e7eb;
        }
        .btn-primary {
          background: #603AC8;
          color: white;
        }
        .btn-primary:hover:not(:disabled) {
          background: #31225C;
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>

      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Re-upload File</h2>
            <button className="close-btn" onClick={onClose} type="button">
              <X size={20} />
            </button>
          </div>

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <CheckCircle size={18} style={{ flexShrink: 0 }} />
              <span>File uploaded successfully!</span>
            </div>
          )}

          <div className="file-input-wrapper">
            <label className="file-input-label">Select File</label>
            <label className={`file-drop-zone ${file ? 'has-file' : ''}`}>
              <div className="upload-icon">
                <Upload size={32} />
              </div>
              <div style={{ marginTop: '8px' }}>
                {file ? (
                  <>
                    <div className="file-name">✓ {file.name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                      Click to browse or drag and drop
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      PDF, DOC, DOCX, PPT, CSV
                    </div>
                  </>
                )}
              </div>
              <input
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.csv"
                style={{ display: 'none' }}
                aria-label="Upload file"
              />
            </label>
          </div>

          <div className="mode-selector">
            <label className="mode-label">What should we do?</label>
            <div className="mode-options">
              <label className={`mode-option ${mergeMode === 'merge' ? 'active' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
                <input
                  type="radio"
                  name="mode"
                  value="merge"
                  checked={mergeMode === 'merge'}
                  onChange={(e) => setMergeMode(e.target.value as 'merge' | 'replace')}
                />
                <div className="mode-option-title">Merge</div>
                <div className="mode-option-desc">
                  Add new courses, keep existing
                </div>
              </label>
              <label className={`mode-option ${mergeMode === 'replace' ? 'active' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
                <input
                  type="radio"
                  name="mode"
                  value="replace"
                  checked={mergeMode === 'replace'}
                  onChange={(e) => setMergeMode(e.target.value as 'merge' | 'replace')}
                />
                <div className="mode-option-title">Replace</div>
                <div className="mode-option-desc">
                  Replace all courses
                </div>
              </label>
            </div>
          </div>

          <div className="button-group">
            <button className="btn btn-secondary" onClick={onClose} disabled={loading} type="button">
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!file || loading}
              type="button"
            >
              {loading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
