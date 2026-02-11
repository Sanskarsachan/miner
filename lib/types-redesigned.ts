/**
 * REDESIGNED Type Definitions - Phase 3 Safe Architecture
 * 
 * Key Principle: SEPARATION OF CONCERNS
 * - Extraction types: Original, pristine, immutable
 * - Mapping types: Results, audit trail, mutable only
 * - Session types: Logging, monitoring, analytics
 */

import { ObjectId } from 'mongodb';

// ============================================================================
// EXTRACTION TYPES (Read-Only, Never Modified)
// ============================================================================

/**
 * Individual course extracted from document
 * NEVER modified by mapping system
 */
export interface ExtractedCourse {
  _id?: ObjectId;
  
  // Core extracted data (exactly as extracted)
  name: string;
  code?: string;
  grade_level?: string;
  credits?: string;
  description?: string;
  category?: string;
  
  // Extraction metadata (for audit)
  confidence_score?: number; // From extraction, not mapping
  extracted_by_api?: string;
  extraction_timestamp: Date;
  
  // NO mapping fields - separation of concerns
  // DO NOT ADD: mappedCode, mappingStatus, etc.
  
  [key: string]: any; // For custom fields
}

/**
 * Extraction document - contains pristine extracted data
 * Status: IMMUTABLE after creation
 * Modifications: FORBIDDEN (no mapping logic modifies this)
 */
export interface Extraction {
  _id?: ObjectId;
  
  // Reference
  file_id: string;
  user_id: ObjectId | string;
  
  // File info
  filename: string;
  file_size: number;
  file_type: string;
  upload_date: Date;
  
  // Pristine extracted data (NEVER MODIFY)
  courses: ExtractedCourse[]; // Original extraction, immutable
  
  // Extraction metadata
  total_courses: number;
  total_pages: number;
  extraction_time_ms: number;
  api_used: string;
  tokens_used: number;
  
  // Status (extraction only, not mapping)
  status: 'processing' | 'completed' | 'failed';
  error_message?: string;
  
  // Timestamps (created once, never modified)
  created_at: Date;
  // updated_at: REMOVED - extraction is write-once
}

// ============================================================================
// MAPPING TYPES (Mutable, Separate Collection)
// ============================================================================

/**
 * Individual course mapping result
 * Stored in separate collection: course_mappings
 */
export interface CourseMapping {
  _id?: ObjectId;
  
  // Reference to original data (read-only link)
  extraction_id: ObjectId | string;
  user_id: ObjectId | string;
  mapping_session_id: ObjectId | string;
  
  // Original course info (copied from extraction)
  source_course: {
    name: string;
    code?: string;
    description?: string;
    grade_level?: string;
  };
  
  // Mapping result
  mapped_code?: string; // From master database
  mapped_name?: string;
  mapped_id?: string; // Reference to master_courses collection
  
  // Match quality
  status: 'unmapped' | 'mapped' | 'flagged_for_review';
  confidence: number; // 0-100, integer
  match_method: 'CODE_MATCH' | 'CODE_TRIM_MATCH' | 'SEMANTIC_MATCH' | 'MANUAL';
  
  // Why was it mapped this way?
  reasoning: string;
  
  // Alternative matches (if ambiguous)
  alternative_matches?: Array<{
    code: string;
    confidence: number;
    name: string;
  }>;
  
  // Flagging
  flags?: {
    reason: string; // "confidence < 75", "ambiguous", etc.
    severity: 'low' | 'medium' | 'high';
  }[];
  
  // Manual review
  manually_reviewed?: {
    reviewed_by: string;
    reviewed_at: Date;
    override_code?: string;
    override_confidence?: number;
    notes?: string;
  };
  
  // Timestamps
  created_at: Date;
  updated_at?: Date; // Only if manually reviewed
}

/**
 * Batch mapping session - logs everything about one mapping operation
 * Stored in separate collection: mapping_sessions
 * Purpose: Audit trail, debugging, analytics
 */
export interface MappingSession {
  _id?: ObjectId;
  
  // Reference
  extraction_id: ObjectId | string;
  user_id: ObjectId | string;
  
  // Session metadata
  status: 'in_progress' | 'completed' | 'failed' | 'partial_failure';
  started_at: Date;
  completed_at?: Date;
  duration_ms?: number;
  
  // Processing info
  total_courses: number;
  courses_processed: number;
  
  // Statistics
  stats: {
    // Mapping results
    total_courses: number;
    code_matches: number;
    trim_matches: number;
    semantic_matches: number;
    manual_matches: number;
    
    // Outcomes
    total_mapped: number;
    flagged: number;
    unmapped: number;
    errors: number;
    
    // Success rate
    success_rate: number; // percentage 0-100
  };
  
  // Gemini interaction log (for audit)
  gemini_calls: {
    call_number: number;
    timestamp: Date;
    
    // Request details
    request: {
      courses_sent: number;
      courses_data: string; // JSON stringified
      prompt_tokens: number;
      total_tokens_requested: number;
    };
    
    // Response details
    response: {
      success: boolean;
      mappings_found: number;
      response_tokens: number;
      total_tokens_used: number;
      error?: string;
      error_type?: 'RATE_LIMIT' | 'AUTH_ERROR' | 'INVALID_REQUEST' | 'SERVER_ERROR' | 'OTHER';
    };
    
    // Cost tracking
    cost: {
      cents: number;
      estimated: boolean;
    };
    
    // Raw response (for debugging)
    raw_response?: string; // Optional, for debugging only
  }[];
  
  // Validation results
  validation: {
    // Invalid codes (exist in mapping but not in master)
    invalid_codes: {
      code: string;
      reason: string;
      mapping_id: ObjectId;
    }[];
    
    // Low confidence mappings
    low_confidence: {
      mapping_id: ObjectId;
      confidence: number;
      threshold: number;
    }[];
    
    // Validation errors
    validation_errors: string[];
  };
  
  // Error log (for debugging)
  error_log?: {
    timestamp: Date;
    error_type: string;
    message: string;
    stack?: string;
    context?: string;
  }[];
  
  // Configuration used
  configuration: {
    mapping_rules: {
      enable_code_matching: boolean;
      enable_trim_matching: boolean;
      enable_semantic_matching: boolean;
      confidence_threshold: number;
    };
    gemini_config: {
      api_key_used: boolean; // boolean, not actual key
      model: string;
      max_tokens: number;
    };
    batch_size: number;
  };
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// CONSTRAINT & CONFIGURATION TYPES
// ============================================================================

/**
 * Mapping rules and configuration
 */
export interface MappingRules {
  // Code matching
  code_matching: {
    enabled: boolean;
    confidence_score: number; // e.g., 100
  };
  
  // Trim matching (first N digits)
  trim_matching: {
    enabled: boolean;
    trim_length: number; // e.g., 7
    confidence_score: number; // e.g., 85
  };
  
  // Semantic matching
  semantic_matching: {
    enabled: boolean;
    confidence_threshold: number; // Below this, mark flagged
    include_descriptions: boolean;
  };
  
  // Validation
  validation: {
    check_against_master: boolean;
    flag_on_ambiguous: boolean;
    flag_low_confidence: boolean;
    low_confidence_threshold: number; // e.g., 75
  };
}

/**
 * Master database constraints for Gemini
 */
export interface MappingConstraints {
  valid_codes: string[];
  code_prefixes: string[];
  code_format_patterns: RegExp[];
  forbidden_outputs: string[];
  confidence_scale: {
    min: number;
    max: number;
    must_be_integer: boolean;
  };
}

/**
 * Context for Gemini API call
 */
export interface GeminiPromptContext {
  system_instructions: string;
  master_database_summary: MasterDatabaseContext;
  extracted_courses: ExtractedCourse[];
  constraints: MappingConstraints;
  examples: MappingExample[];
}

export interface MasterDatabaseContext {
  total_courses: number;
  by_category: { [key: string]: number };
  valid_codes: string[];
  code_prefixes: string[];
  sample_courses: Array<{
    code: string;
    name: string;
    category: string;
  }>;
}

export interface MappingExample {
  input: {
    name: string;
    description?: string;
  };
  output: {
    mapped_code: string;
    confidence: number;
    reasoning: string;
  };
}

// ============================================================================
// MASTER COURSE TYPE (Reference)
// ============================================================================

/**
 * Master course - the source of truth
 * Stored in: master_courses collection
 */
export interface MasterCourse {
  _id?: ObjectId;
  
  category: string;
  sub_category: string;
  course_code: string;
  course_name: string;
  course_title: string;
  level_length?: string;
  length?: string;
  level?: string;
  grad_requirement?: string;
  credits?: string;
  
  // Metadata
  source_file?: string;
  added_at?: Date;
  
  // For search/indexing
  normalized_code?: string;
  normalized_name?: string;
  
  [key: string]: any;
}

// ============================================================================
// VALIDATION & RESPONSE TYPES
// ============================================================================

export interface ValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface GeminiRawResponse {
  mappings: Array<{
    source_name: string;
    mapped_code: string;
    confidence: number;
    reasoning: string;
    alternative_matches?: string[];
    should_flag: boolean;
  }>;
  unmapped: Array<{
    source_name: string;
    reason: string;
    suggestions?: string[];
  }>;
  errors: Array<{
    input_index?: number;
    error_type: string;
    message: string;
  }>;
}

export interface MappingResult {
  session_id: string;
  success: boolean;
  stats: {
    total_courses: number;
    mapped: number;
    flagged: number;
    unmapped: number;
    errors: number;
  };
  mappings: CourseMapping[];
  errors?: string[];
}

// ============================================================================
// UI/COMPONENT TYPES
// ============================================================================

export interface MappingStats {
  total: number;
  mapped: number;
  unmapped: number;
  flagged: number;
  successRate: number;
  byMethod: {
    code_match: number;
    trim_match: number;
    semantic_match: number;
  };
}

export interface MappingProgress {
  step: 'validation' | 'preparing' | 'deterministic' | 'semantic' | 'validation2' | 'persisting' | 'completed';
  percentage: number;
  message: string;
  details?: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface SafeMappingRequest {
  extraction_id: string;
  api_key: string;
  mapping_rules?: Partial<MappingRules>;
  dry_run?: boolean; // Only return results, don't persist
}

export interface SafeMappingResponse {
  success: boolean;
  data?: {
    session_id: string;
    stats: MappingStats;
    mappings: CourseMapping[];
    flagged_courses: CourseMapping[];
  };
  error?: string;
  errors?: string[];
}

// ============================================================================
// API KEY MANAGEMENT TYPES
// ============================================================================

/**
 * Gemini API Key with quota tracking
 * Store multiple API keys and track usage per day
 * 
 * Rate Limit: 20 RPM per API key
 * Quota: 19 RPM usable (1 reserved for safety)
 */
export interface GeminiApiKey {
  _id?: ObjectId;
  
  // Key metadata
  key: string; // Encrypted in production
  nickname: string; // User-friendly name
  provider: 'gemini' | 'openai'; // Future support for other providers
  created_at: Date;
  updated_at: Date;
  
  // Status
  is_active: boolean;
  is_deleted: boolean;
  last_used?: Date;
  
  // Daily quota management (20 RPM = 1200 per hour)
  quota: {
    daily_limit: number; // Default: 20 RPM * 1440 min = 28,800 requests per day
    used_today: number; // Reset daily at midnight UTC
    reset_at: Date; // When quota resets
  };
  
  // Usage tracking
  usage: {
    total_requests: number; // All-time
    total_tokens_used: number;
    estimated_cost_cents: number; // ~$0.0001 per 1M input tokens, $0.0002 per 1M output
  };
  
  // Daily breakdown
  daily_usage: {
    date: string; // YYYY-MM-DD format
    requests_used: number;
    tokens_used: number;
  }[];
}

/**
 * API Usage Log - Track what schools/extractions used which API key on which day
 */
export interface ApiUsageLog {
  _id?: ObjectId;
  
  // References
  api_key_id: ObjectId;
  extraction_id?: ObjectId;
  user_id: ObjectId | string;
  
  // What was processed
  school_name?: string;
  file_name?: string;
  
  // Usage details
  date: Date;
  requests_count: number; // How many requests used this API key
  tokens_used: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  
  // Status
  success: boolean;
  error_message?: string;
  
  // Cost tracking
  estimated_cost_cents: number;
}

/**
 * API Key selection for extraction/mapping processes
 * User selects which API key to use before processing
 */
export interface ApiKeySelection {
  api_key_id: ObjectId;
  nickname: string;
  rpd_remaining: number; // Remaining requests per day
  daily_limit: number;
  percentage_used: number; // 0-100
}

/**
 * API Key Dashboard Statistics
 * Shows aggregated stats for viewing
 */
export interface ApiKeyStats {
  api_key_id: ObjectId;
  nickname: string;
  is_active: boolean;
  
  // Today's usage
  today: {
    requests_used: number;
    requests_remaining: number;
    requests_limit: number;
    percentage_used: number;
    tokens_used: number;
  };
  
  // Historical
  this_month: {
    requests_used: number;
    tokens_used: number;
    days_active: number;
  };
  
  // All-time
  all_time: {
    total_requests: number;
    total_tokens: number;
    estimated_cost_cents: number;
    days_since_created: number;
  };
  
  // Schools using this key today
  schools_today: {
    school_name: string;
    requests_count: number;
  }[];
  
  last_used?: Date;
  created_at: Date;
}
