/**
 * Database Type Definitions
 * v2 Feature: Type-safe database operations
 */

import { ObjectId } from 'mongodb'

export interface User {
  _id?: ObjectId
  email: string
  username: string
  organization?: string
  
  // API Keys
  api_keys: {
    gemini?: string
    claude?: string
    openai?: string
  }
  
  // Daily Quotas
  daily_quota: {
    courses_extracted: number
    courses_used_today: number
    courses_remaining: number
    reset_date: Date
  }
  
  // Preferences
  preferred_api: 'gemini' | 'claude' | 'openai'
  export_formats: string[]
  auto_refine: boolean
  
  // Timestamps
  created_at: Date
  updated_at: Date
}

export interface Course {
  _id?: ObjectId
  name: string
  code?: string
  grade_level?: string
  credits?: string
  description?: string
  details?: string
  category?: string
  confidence_score?: number
  extracted_by_api?: string
}

export interface Extraction {
  _id?: ObjectId
  file_id: string
  user_id: ObjectId | string
  username?: string
  
  // File Info
  filename: string
  file_size: number
  file_type: string
  upload_date: Date
  
  // Extraction Data
  courses: Course[]
  
  // Metadata
  total_courses: number
  total_pages: number
  extraction_time_ms: number
  api_used: string
  tokens_used: number
  
  // Extended Metadata (for UI display)
  metadata?: {
    file_size?: number
    file_type?: string
    total_pages?: number
    pages_processed?: number
  }
  
  // Status
  status: 'processing' | 'completed' | 'failed'
  error_message?: string
  
  // Versioning
  current_version: number
  is_refined: boolean
  last_refined_at?: Date
  
  // Timestamps
  created_at: Date
  updated_at: Date
}

export interface ExtractionVersion {
  _id?: ObjectId
  extraction_id: ObjectId | string
  user_id: ObjectId | string
  
  version_number: number
  
  // Changes Tracking
  changes: {
    added?: Course[]
    modified?: Array<{
      course_id: ObjectId
      field: string
      old_value: any
      new_value: any
    }>
    removed?: Course[]
  }
  
  total_courses: number
  refined_by: 'manual' | 'ai_suggestion' | 'user_input'
  notes?: string
  
  // Timestamps
  created_at: Date
  parent_version?: number
}

export interface APILog {
  _id?: ObjectId
  user_id: ObjectId | string
  extraction_id?: ObjectId | string
  
  api_used: string
  request_tokens: number
  response_tokens: number
  total_tokens: number
  
  courses_extracted: number
  success: boolean
  error_message?: string
  
  response_time_ms: number
  timestamp: Date
  
  // Rate limit tracking
  rate_limit_remaining: number
  daily_quota_remaining: number
}

export interface UserStats {
  total_files: number
  total_courses: number
  total_storage_mb: number
  this_month_courses: number
  this_week_courses: number
  today_courses: number
  average_courses_per_file: number
  most_common_category: string
}
