import React, { useState, useEffect } from 'react';
import { V2Sidebar } from '../../components/V2Sidebar';
import { ExtractionDetailCard } from '../../components/ExtractionDetailCard';
import Head from 'next/head';

interface Extraction {
  _id: string;
  filename: string;
  total_courses: number;
  created_at: string;
  updated_at: string;
  status: 'pending' | 'completed' | 'failed';
  tokens_used: number;
  pages_processed?: number;
  current_version?: number;
  is_refined?: boolean;
}

export default function V2ExtractionsPage() {
  const [selectedExtraction, setSelectedExtraction] = useState<Extraction | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (format: 'csv' | 'json' | 'excel') => {
    if (!selectedExtraction) return;

    setExporting(format);
    try {
      // For now, create a basic CSV export
      // In a real app, this would fetch the full course data from MongoDB
      let content: string;
      let filename: string;
      let mimeType: string;

      switch (format) {
        case 'csv':
          content = generateCSV(selectedExtraction);
          filename = `${selectedExtraction.filename}_courses.csv`;
          mimeType = 'text/csv';
          break;
        case 'json':
          content = generateJSON(selectedExtraction);
          filename = `${selectedExtraction.filename}_courses.json`;
          mimeType = 'application/json';
          break;
        case 'excel':
          content = generateCSV(selectedExtraction); // Using CSV for now
          filename = `${selectedExtraction.filename}_courses.xlsx`;
          mimeType = 'application/vnd.ms-excel';
          break;
        default:
          return;
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert(`Failed to export as ${format}`);
      console.error(error);
    } finally {
      setExporting(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedExtraction) return;

    if (!confirm(`Delete "${selectedExtraction.filename}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/v2/extractions/${selectedExtraction._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSelectedExtraction(null);
        // Show success message (could use toast notification)
        alert('Extraction deleted successfully');
      } else {
        alert('Failed to delete extraction');
      }
    } catch (error) {
      alert('Error deleting extraction');
      console.error(error);
    }
  };

  return (
    <>
      <Head>
        <title>Extractions - Course Harvester V2</title>
        <meta name="description" content="Manage your course extractions" />
      </Head>

      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <div className="w-full max-w-md h-full bg-slate-900 shadow-lg">
          <V2Sidebar
            onSelectFile={setSelectedExtraction}
            selectedFileId={selectedExtraction?._id}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {/* Header Bar */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Course Extractions</h1>
                  <p className="text-gray-600 mt-1">
                    Manage, refine, and export your extracted course data
                  </p>
                </div>
                <a
                  href="/courseharvester"
                  className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  + New Extraction
                </a>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-8">
              <ExtractionDetailCard
                extraction={selectedExtraction}
                onDelete={handleDelete}
                onExport={handleExport}
              />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 1024px) {
          .sidebar {
            width: 100%;
            max-width: none;
            height: auto;
            border-right: none;
            border-bottom: 1px solid #e5e7eb;
          }

          .main-content {
            flex-direction: column;
          }
        }
      `}</style>
    </>
  );
}

// Helper functions for export
function generateCSV(extraction: Extraction): string {
  const headers = ['Course Code', 'Course Name', 'Details', 'Confidence'];
  const rows = [headers];

  // TODO: Fetch actual courses from MongoDB
  // For now, add a header row
  rows.push(['', '', '', '']);
  rows.push(['Note: Full course data will be displayed here', '', '', '']);

  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

function generateJSON(extraction: Extraction): string {
  return JSON.stringify(
    {
      filename: extraction.filename,
      totalCourses: extraction.total_courses,
      tokensUsed: extraction.tokens_used,
      pagesProcessed: extraction.pages_processed,
      createdAt: extraction.created_at,
      updatedAt: extraction.updated_at,
      courses: [], // TODO: Fetch from MongoDB
    },
    null,
    2
  );
}
