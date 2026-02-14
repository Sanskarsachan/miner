/**
 * Analytics Dashboard - API Key Usage Tracking
 * Displays school-by-school API consumption statistics
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { AlertCircle, TrendingUp, Activity, Zap, RefreshCw } from 'lucide-react';

interface UsageStats {
  api_key_id: string;
  nickname: string;
  daily_limit: number;
  rpd_remaining: number;
  rpd_used: number;
  percentage_used: number;
  last_used: string;
  extraction_count: number;
}

interface SchoolUsage {
  school: string;
  extractions: number;
  apiKeysUsed: number;
}

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<UsageStats[]>([]);
  const [schoolUsage, setSchoolUsage] = useState<SchoolUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalApiUsage, setTotalApiUsage] = useState(0);
  const [totalExtractionsToday, setTotalExtractionsToday] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      // Fetch API key usage stats
      const statsResponse = await fetch('/api/v2/api-keys/stats');
      const statsResult = await statsResponse.json();

      if (statsResult.success) {
        const apiStats = statsResult.data || [];
        setStats(apiStats);

        // Calculate totals
        const totalUsed = apiStats.reduce((sum: number, stat: UsageStats) => sum + stat.rpd_used, 0);
        setTotalApiUsage(totalUsed);

        const totalExtractions = apiStats.reduce((sum: number, stat: UsageStats) => sum + stat.extraction_count, 0);
        setTotalExtractionsToday(totalExtractions);
      } else {
        setError(statsResult.error || 'Failed to load API stats');
      }

      // Fetch extraction data for school breakdown
      const extractionsResponse = await fetch('/api/v2/extractions/list');
      const extractionsResult = await extractionsResponse.json();

      if (extractionsResult.success) {
        const extractions = extractionsResult.data || [];

        // Group by school/source
        const schoolMap = new Map<string, { count: number; keys: Set<string> }>();
        extractions.forEach((extraction: any) => {
          const school = extraction.source || extraction.filename || 'Unknown';
          if (!schoolMap.has(school)) {
            schoolMap.set(school, { count: 0, keys: new Set() });
          }
          const entry = schoolMap.get(school)!;
          entry.count += 1;
          if (extraction.api_key_id) {
            entry.keys.add(extraction.api_key_id);
          }
        });

        // Convert to array and sort by count descending
        const schoolData: SchoolUsage[] = Array.from(schoolMap.entries())
          .map(([school, data]) => ({
            school,
            extractions: data.count,
            apiKeysUsed: data.keys.size,
          }))
          .sort((a, b) => b.extractions - a.extractions);

        setSchoolUsage(schoolData);
      }
      setLastRefresh(new Date());
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load analytics: ${errMsg}`);
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  return (
    <>
      <Head>
        <title>API Analytics - Course Harvester</title>
      </Head>

      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '32px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                  📊 API Usage Analytics
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
                  Real-time tracking of API key consumption and extraction activity
                </p>
              </div>
              <button
                onClick={loadAnalytics}
                disabled={isRefreshing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: 'white',
                  color: '#603ac8',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: isRefreshing ? 'not-allowed' : 'pointer',
                  opacity: isRefreshing ? 0.7 : 1,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => !isRefreshing && (e.currentTarget.style.background = '#f3f4f6')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
              >
                <RefreshCw size={18} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            {lastRefresh && (
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
                Last updated: {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>

          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>

          {error && (
            <div
              style={{
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '24px',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                color: '#991b1b',
              }}
            >
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', color: 'white', padding: '48px' }}>
              <div style={{ fontSize: '18px' }}>Loading analytics...</div>
            </div>
          ) : (
            <>
              {/* Quick Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <Zap size={20} style={{ color: '#603ac8' }} />
                    <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>TOTAL API CALLS</span>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>{totalApiUsage}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>across all keys today</div>
                </div>

                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <Activity size={20} style={{ color: '#5B21B6' }} />
                    <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>EXTRACTIONS TODAY</span>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>{totalExtractionsToday}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>PDFs processed</div>
                </div>

                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <TrendingUp size={20} style={{ color: '#009688' }} />
                    <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>API KEYS ACTIVE</span>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>{stats.filter((s) => s.rpd_remaining > 0).length}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>out of {stats.length}</div>
                </div>
              </div>

              {/* API Keys Usage Table */}
              <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '32px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={20} style={{ color: '#603ac8' }} />
                  API Key Status
                </h2>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ textAlign: 'left', padding: '12px', color: '#6b7280', fontWeight: '600' }}>API Key</th>
                        <th style={{ textAlign: 'center', padding: '12px', color: '#6b7280', fontWeight: '600' }}>Quota Status</th>
                        <th style={{ textAlign: 'center', padding: '12px', color: '#6b7280', fontWeight: '600' }}>Remaining</th>
                        <th style={{ textAlign: 'center', padding: '12px', color: '#6b7280', fontWeight: '600' }}>Usage %</th>
                        <th style={{ textAlign: 'center', padding: '12px', color: '#6b7280', fontWeight: '600' }}>Extractions</th>
                        <th style={{ textAlign: 'left', padding: '12px', color: '#6b7280', fontWeight: '600' }}>Last Used</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>
                            No API keys configured. Set up API keys in the system to see usage data.
                          </td>
                        </tr>
                      ) : (
                        stats.map((stat) => (
                          <tr key={stat.api_key_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '12px', fontWeight: '500', color: '#111827' }}>{stat.nickname}</td>
                            <td
                              style={{
                                textAlign: 'center',
                                padding: '12px',
                                color: stat.rpd_remaining === 0 ? '#dc2626' : '#059669',
                                fontWeight: '600',
                                fontSize: '15px',
                              }}
                            >
                              {stat.rpd_used}/{stat.daily_limit}
                            </td>
                            <td
                              style={{
                                textAlign: 'center',
                                padding: '12px',
                                color: stat.rpd_remaining === 0 ? '#dc2626' : '#059669',
                                fontWeight: '500',
                              }}
                            >
                              {stat.rpd_remaining}
                            </td>
                            <td style={{ textAlign: 'center', padding: '12px' }}>
                              <div
                                style={{
                                  background: '#e5e7eb',
                                  borderRadius: '4px',
                                  height: '6px',
                                  width: '80px',
                                  margin: '0 auto',
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    background: stat.percentage_used > 80 ? '#dc2626' : stat.percentage_used > 50 ? '#f59e0b' : '#10b981',
                                    height: '100%',
                                    width: `${stat.percentage_used}%`,
                                    transition: 'width 0.3s ease',
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '12px', color: '#6b7280' }}>{stat.percentage_used}%</span>
                            </td>
                            <td style={{ textAlign: 'center', padding: '12px', color: '#374151' }}>{stat.extraction_count}</td>
                            <td style={{ padding: '12px', color: '#6b7280', fontSize: '12px' }}>{stat.last_used || 'Never'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* School/Source Breakdown */}
              <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={20} style={{ color: '#5B21B6' }} />
                  Extraction Activity by Source
                </h2>

                {schoolUsage.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>
                    No extraction data available. Upload and extract PDFs to see activity here.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                          <th style={{ textAlign: 'left', padding: '12px', color: '#6b7280', fontWeight: '600' }}>Source / School</th>
                          <th style={{ textAlign: 'center', padding: '12px', color: '#6b7280', fontWeight: '600' }}>Extractions</th>
                          <th style={{ textAlign: 'center', padding: '12px', color: '#6b7280', fontWeight: '600' }}>API Keys Used</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schoolUsage.map((school, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '12px', fontWeight: '500', color: '#111827' }}>{school.school}</td>
                            <td style={{ textAlign: 'center', padding: '12px', color: '#374151' }}>
                              <span
                                style={{
                                  background: '#dbeafe',
                                  color: '#1e40af',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontWeight: '500',
                                }}
                              >
                                {school.extractions}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center', padding: '12px', color: '#374151' }}>
                              {school.apiKeysUsed} key{school.apiKeysUsed === 1 ? '' : 's'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Refresh Note */}
              <div style={{ marginTop: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                Click the Refresh button to update data
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
