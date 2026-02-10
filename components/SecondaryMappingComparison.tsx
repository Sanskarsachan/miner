/**
 * Secondary Mapping Comparison Component
 * 
 * Displays side-by-side comparison of primary vs secondary (AI) mapping results
 * Allows users to understand the differences and choose which approach to use
 */

import React, { useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';

interface SecondaryMappingData {
  cleanedTitle: string;
  suggestedCode: string;
  suggestedName?: string;
  confidence: number;
  reasoning: string;
  alternativeSuggestions?: Array<{
    code: string;
    name: string;
    confidence: number;
  }>;
  aiModel: string;
  runAt: Date;
}

interface CourseComparisonProps {
  originalName: string;
  originalCode?: string;
  primaryMapping?: {
    mappedCode?: string;
    mappedName?: string;
    confidence?: number;
    status?: string;
  };
  secondaryMapping?: SecondaryMappingData;
  onSelectPrimary?: () => void;
  onSelectSecondary?: () => void;
}

export function CourseComparisonCard({
  originalName,
  originalCode,
  primaryMapping,
  secondaryMapping,
  onSelectPrimary,
  onSelectSecondary,
}: CourseComparisonProps) {
  const [expanded, setExpanded] = useState(false);

  const isPrimaryMapped = !!primaryMapping?.mappedCode;
  const isSecondaryMapped = secondaryMapping?.suggestedCode && secondaryMapping?.suggestedCode !== 'UNMAPPED';

  const codeDiffers = isPrimaryMapped && isSecondaryMapped && 
    primaryMapping?.mappedCode !== secondaryMapping?.suggestedCode;

  return (
    <div className="border border-gray-300 rounded-lg p-4 mb-3 bg-white">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{originalName}</h4>
          {originalCode && (
            <p className="text-sm text-gray-500">Original Code: {originalCode}</p>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-500 hover:text-gray-700"
        >
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {/* Comparison Row */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Primary Mapping */}
        <div className={`border rounded p-3 ${
          isPrimaryMapped ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="text-xs font-semibold text-gray-600 mb-2">PRIMARY MAPPING</div>
          <div className="space-y-1">
            <div className="font-semibold text-gray-900">
              {primaryMapping?.mappedCode || 'Unmapped'}
            </div>
            {primaryMapping?.mappedName && (
              <p className="text-xs text-gray-600">{primaryMapping.mappedName}</p>
            )}
            {primaryMapping?.confidence !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                <div className="flex-1 h-2 bg-gray-200 rounded overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${primaryMapping.confidence}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-8 text-right">
                  {primaryMapping.confidence}%
                </span>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Status: <span className="font-semibold capitalize">{primaryMapping?.status || 'unknown'}</span>
            </p>
          </div>
          {isPrimaryMapped && onSelectPrimary && (
            <button
              onClick={onSelectPrimary}
              className="mt-2 w-full px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Use This
            </button>
          )}
        </div>

        {/* Secondary Mapping */}
        <div className={`border rounded p-3 ${
          isSecondaryMapped ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="text-xs font-semibold text-gray-600 mb-2">AI SUGGESTION</div>
          <div className="space-y-1">
            <div className="font-semibold text-gray-900">
              {secondaryMapping?.suggestedCode || 'No suggestion'}
            </div>
            {secondaryMapping?.suggestedName && (
              <p className="text-xs text-gray-600">{secondaryMapping.suggestedName}</p>
            )}
            {secondaryMapping?.confidence !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                <div className="flex-1 h-2 bg-gray-200 rounded overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${secondaryMapping.confidence}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-8 text-right">
                  {secondaryMapping?.confidence || 0}%
                </span>
              </div>
            )}
            {secondaryMapping?.cleanedTitle && secondaryMapping.cleanedTitle !== originalName && (
              <p className="text-xs text-gray-500 mt-2">
                Cleaned: <span className="font-semibold">{secondaryMapping.cleanedTitle}</span>
              </p>
            )}
          </div>
          {isSecondaryMapped && onSelectSecondary && (
            <button
              onClick={onSelectSecondary}
              className="mt-2 w-full px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              Use This
            </button>
          )}
        </div>
      </div>

      {/* Code Difference Indicator */}
      {codeDiffers && (
        <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-xs font-semibold text-yellow-800">
            ⚠️ Codes differ: {primaryMapping?.mappedCode} vs {secondaryMapping?.suggestedCode}
          </p>
        </div>
      )}

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
          {secondaryMapping?.reasoning && (
            <div>
              <h5 className="text-xs font-semibold text-gray-600 mb-1">AI Reasoning</h5>
              <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded">
                {secondaryMapping.reasoning}
              </p>
            </div>
          )}

          {secondaryMapping?.alternativeSuggestions && secondaryMapping.alternativeSuggestions.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-gray-600 mb-2">Alternative Suggestions</h5>
              <div className="space-y-1">
                {secondaryMapping.alternativeSuggestions.map((alt, i) => (
                  <div key={i} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                    <div>
                      <span className="font-semibold">{alt.code}</span>
                      {alt.name && <span className="text-gray-600 ml-1">- {alt.name}</span>}
                    </div>
                    <span className="text-gray-700 font-semibold">{alt.confidence}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {secondaryMapping && (
            <div className="text-xs text-gray-500">
              <p>Generated by: <span className="font-mono font-semibold">{secondaryMapping.aiModel}</span></p>
              <p>Run at: <span className="font-semibold">{new Date(secondaryMapping.runAt).toLocaleString()}</span></p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SecondaryMappingComparisonViewProps {
  extractionId: string;
  courses: Array<{
    _id?: string;
    name?: string;
    CourseName?: string;
    code?: string;
    CourseCode?: string;
    mappedCode?: string;
    mappingStatus?: string;
    confidence?: number;
    secondaryMapping?: SecondaryMappingData;
  }>;
  onClose?: () => void;
}

export function SecondaryMappingComparisonView({
  extractionId,
  courses,
  onClose,
}: SecondaryMappingComparisonViewProps) {
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false);

  const mappedCourses = showOnlyDifferences
    ? courses.filter((c) => {
        const hasPrimary = !!c.mappedCode;
        const hasSecondary = !!c.secondaryMapping?.suggestedCode && c.secondaryMapping.suggestedCode !== 'UNMAPPED';
        const differs = c.mappedCode !== c.secondaryMapping?.suggestedCode;
        return (hasPrimary || hasSecondary) && differs;
      })
    : courses;

  const stats = {
    total: courses.length,
    primaryMapped: courses.filter((c) => c.mappedCode).length,
    secondaryMapped: courses.filter((c) => c.secondaryMapping?.suggestedCode && c.secondaryMapping.suggestedCode !== 'UNMAPPED').length,
    bothMapped: courses.filter((c) => c.mappedCode && c.secondaryMapping?.suggestedCode && c.secondaryMapping.suggestedCode !== 'UNMAPPED').length,
    highConfidencyAI: courses.filter((c) => (c.secondaryMapping?.confidence || 0) >= 85).length,
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-green-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Primary vs AI Mapping Comparison</h2>
            <p className="text-blue-100 text-sm mt-1">Compare traditional and AI-first course mapping results</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded px-3 py-2"
            >
              ✕
            </button>
          )}
        </div>

        {/* Statistics */}
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="grid grid-cols-5 gap-3">
            <div className="bg-white p-3 rounded border border-gray-200">
              <div className="text-xs font-semibold text-gray-600">Total Courses</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-white p-3 rounded border border-blue-300">
              <div className="text-xs font-semibold text-gray-600">Primary Mapped</div>
              <div className="text-2xl font-bold text-blue-600">{stats.primaryMapped}</div>
            </div>
            <div className="bg-white p-3 rounded border border-green-300">
              <div className="text-xs font-semibold text-gray-600">AI Suggested</div>
              <div className="text-2xl font-bold text-green-600">{stats.secondaryMapped}</div>
            </div>
            <div className="bg-white p-3 rounded border border-purple-300">
              <div className="text-xs font-semibold text-gray-600">Both Found</div>
              <div className="text-2xl font-bold text-purple-600">{stats.bothMapped}</div>
            </div>
            <div className="bg-white p-3 rounded border border-orange-300">
              <div className="text-xs font-semibold text-gray-600">AI High Confidence</div>
              <div className="text-2xl font-bold text-orange-600">{stats.highConfidencyAI}</div>
            </div>
          </div>
        </div>

        {/* Filter Toggle */}
        <div className="border-b border-gray-200 p-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyDifferences}
              onChange={(e) => setShowOnlyDifferences(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-semibold text-gray-700">
              Show only courses with differences ({mappedCourses.length} of {courses.length})
            </span>
          </label>
        </div>

        {/* Courses */}
        <div className="p-4">
          {mappedCourses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No courses match the current filter.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {mappedCourses.map((course, index) => (
                <CourseComparisonCard
                  key={index}
                  originalName={course.name || course.CourseName || 'Unknown'}
                  originalCode={course.code || course.CourseCode}
                  primaryMapping={{
                    mappedCode: course.mappedCode,
                    confidence: course.confidence,
                    status: course.mappingStatus,
                  }}
                  secondaryMapping={course.secondaryMapping}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 p-4 flex items-center justify-between">
          <p className="text-xs text-gray-600">
            Extraction ID: <span className="font-mono font-semibold">{extractionId}</span>
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-900 rounded font-semibold hover:bg-gray-400"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
