/**
 * Mapping Dashboard Component
 * Displays real-time refinement progress and results with color-coded status badges
 */

import React, { useState } from 'react';
import { CheckCircle, AlertCircle, XCircle, Loader } from 'lucide-react';

interface MappingResult {
  totalProcessed: number;
  newlyMapped: number;
  stillUnmapped: number;
  flaggedForReview: number;
  details: {
    codeMatches: number;
    trimMatches: number;
    semanticMatches: number;
  };
}

interface MappingDashboardProps {
  extractionId: string;
  onRefineStart?: () => void;
  onRefineComplete?: (result: MappingResult) => void;
  onRefineError?: (error: string) => void;
}

export default function MappingDashboard({
  extractionId,
  onRefineStart,
  onRefineComplete,
  onRefineError,
}: MappingDashboardProps) {
  const [isRefining, setIsRefining] = useState(false);
  const [result, setResult] = useState<MappingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');

  const handleStartRefinement = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your Gemini API key');
      return;
    }

    setIsRefining(true);
    setError(null);
    onRefineStart?.();

    try {
      const response = await fetch('/api/v2/refine-extractions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extractionId,
          apiKey,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to refine extractions');
      }

      setResult(data.data);
      onRefineComplete?.(data.data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      onRefineError?.(errorMsg);
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style jsx>{`
        .dashboard {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          padding: 24px;
          color: white;
          margin-bottom: 24px;
        }

        .dashboard-header {
          margin-bottom: 24px;
        }

        .dashboard-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .dashboard-subtitle {
          font-size: 14px;
          opacity: 0.9;
        }

        .input-section {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .api-key-input {
          flex: 1;
          min-width: 250px;
          padding: 12px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          background: rgba(255, 255, 255, 0.95);
          color: #1f2937;
        }

        .api-key-input::placeholder {
          color: #9ca3af;
        }

        .api-key-input:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
        }

        .refine-btn {
          padding: 12px 28px;
          background: white;
          color: #667eea;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }

        .refine-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        }

        .refine-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .error-alert {
          background: #fee2e2;
          color: #991b1b;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
          font-size: 14px;
        }

        .status-badges {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }

        .badge {
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 16px;
          border-radius: 8px;
          backdrop-filter: blur(10px);
          text-align: center;
        }

        .badge-value {
          font-size: 32px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .badge-label {
          font-size: 13px;
          opacity: 0.9;
        }

        .badge.green {
          background: rgba(16, 185, 129, 0.2);
          border-color: rgba(16, 185, 129, 0.5);
        }

        .badge.red {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.5);
        }

        .badge.blue {
          background: rgba(59, 130, 246, 0.2);
          border-color: rgba(59, 130, 246, 0.5);
        }

        .badge.yellow {
          background: rgba(251, 191, 36, 0.2);
          border-color: rgba(251, 191, 36, 0.5);
        }

        .details-section {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 16px;
          margin-top: 16px;
        }

        .details-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 12px;
          opacity: 0.9;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }

        .detail-item {
          background: rgba(255, 255, 255, 0.05);
          padding: 12px;
          border-radius: 6px;
          border-left: 3px solid rgba(255, 255, 255, 0.3);
        }

        .detail-label {
          font-size: 11px;
          opacity: 0.8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }

        .detail-value {
          font-size: 18px;
          font-weight: 700;
        }

        .loading-spinner {
          display: inline-block;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .message {
          background: rgba(255, 255, 255, 0.1);
          border-left: 3px solid white;
          padding: 12px 16px;
          border-radius: 6px;
          margin-top: 16px;
          font-size: 14px;
          line-height: 1.6;
        }
      `}</style>

      <div className="dashboard">
        <div className="dashboard-header">
          <h2 className="dashboard-title">🎯 Course Mapping Refinement</h2>
          <p className="dashboard-subtitle">
            Map extracted courses to your master database using intelligent matching
          </p>
        </div>

        {error && (
          <div className="error-alert">
            <XCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <div className="input-section">
          <input
            type="password"
            className="api-key-input"
            placeholder="Enter Gemini API key (aistudio.google.com)"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={isRefining}
          />
          <button
            className="refine-btn"
            onClick={handleStartRefinement}
            disabled={isRefining || !extractionId}
          >
            {isRefining ? (
              <>
                <span className="loading-spinner">
                  <Loader size={16} />
                </span>
                Refining...
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                Start Refinement
              </>
            )}
          </button>
        </div>

        {result && (
          <>
            <div className="status-badges">
              <div className="badge green">
                <div className="badge-value">
                  <CheckCircle size={24} />
                  {result.newlyMapped}
                </div>
                <div className="badge-label">Courses Mapped</div>
              </div>

              <div className="badge red">
                <div className="badge-value">
                  <XCircle size={24} />
                  {result.stillUnmapped}
                </div>
                <div className="badge-label">Still Unmapped</div>
              </div>

              <div className="badge yellow">
                <div className="badge-value">
                  <AlertCircle size={24} />
                  {result.flaggedForReview}
                </div>
                <div className="badge-label">Flagged for Review</div>
              </div>

              <div className="badge blue">
                <div className="badge-value">{result.totalProcessed}</div>
                <div className="badge-label">Total Processed</div>
              </div>
            </div>

            <div className="details-section">
              <div className="details-title">Matching Method Breakdown</div>
              <div className="details-grid">
                <div className="detail-item">
                  <div className="detail-label">Direct Code Match</div>
                  <div className="detail-value">{result.details.codeMatches}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Trimmed Code Match</div>
                  <div className="detail-value">{result.details.trimMatches}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">AI Semantic Match</div>
                  <div className="detail-value">{result.details.semanticMatches}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Success Rate</div>
                  <div className="detail-value">
                    {result.totalProcessed > 0
                      ? Math.round(
                          (result.newlyMapped / result.totalProcessed) * 100
                        )
                      : 0}
                    %
                  </div>
                </div>
              </div>
            </div>

            <div className="message">
              ✅ Refinement complete! {result.newlyMapped} courses have been mapped
              to your master database. {result.flaggedForReview > 0 && `${result.flaggedForReview} courses need manual review due to lower confidence scores.`}
            </div>
          </>
        )}

        {isRefining && !result && (
          <div className="message">
            🔄 Processing courses... This may take a minute depending on the
            number of unmapped courses.
          </div>
        )}
      </div>
    </div>
  );
}
