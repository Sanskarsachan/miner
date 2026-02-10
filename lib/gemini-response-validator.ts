/**
 * Gemini Response Validator
 * 
 * Purpose: Validate all Gemini outputs before they enter the database
 * Safety: Catches hallucinated codes, invalid data, format errors
 * Audit: Logs all validation failures for debugging
 */

import {
  GeminiRawResponse,
  CourseMapping,
  ExtractedCourse,
  MappingConstraints,
  ValidationResult,
} from './types-redesigned';

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates entire Gemini response structure and content
 */
export function validateGeminiResponse(
  rawResponse: string | GeminiRawResponse,
  constraints: MappingConstraints,
  sourceCourses: ExtractedCourse[]
): ValidationResult & {
  parsedResponse?: GeminiRawResponse;
  processedMappings?: Partial<CourseMapping>[];
  validationDetails?: {
    structureValid: boolean;
    codesValid: boolean;
    confidenceValid: boolean;
    sourceCoursesMatched: boolean;
  };
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  let parsedResponse: GeminiRawResponse | null = null;

  // Step 1: Parse JSON
  try {
    if (typeof rawResponse === 'string') {
      parsedResponse = JSON.parse(rawResponse);
    } else {
      parsedResponse = rawResponse;
    }
  } catch (e) {
    return {
      is_valid: false,
      errors: [`Invalid JSON response: ${e instanceof Error ? e.message : String(e)}`],
      warnings,
    };
  }

  // Step 2: Validate structure
  if (!parsedResponse) {
    return {
      is_valid: false,
      errors: ['Response is null or undefined'],
      warnings,
    };
  }

  if (!Array.isArray(parsedResponse.mappings)) {
    errors.push('Response missing "mappings" array');
  }
  if (!Array.isArray(parsedResponse.unmapped)) {
    errors.push('Response missing "unmapped" array');
  }
  if (!Array.isArray(parsedResponse.errors)) {
    errors.push('Response missing "errors" array');
  }

  // If structure is invalid, stop here
  if (errors.length > 0) {
    return {
      is_valid: false,
      errors,
      warnings,
      parsedResponse,
    };
  }

  // Step 3: Validate each mapping
  const validMappings: Partial<CourseMapping>[] = [];
  const sourceCoursesMap = new Map(
    sourceCourses.map((c) => [normalize(c.name), c])
  );

  for (let i = 0; i < parsedResponse.mappings.length; i++) {
    const mapping = parsedResponse.mappings[i];
    const mappingErrors = validateMapping(
      mapping,
      constraints,
      sourceCoursesMap,
      i
    );

    if (mappingErrors.length > 0) {
      errors.push(...mappingErrors);
    } else {
      // Mapping is valid, prepare for storage
      validMappings.push({
        source_course: {
          name: mapping.source_name,
          code: mapping.source_code,
        },
        mapped_code: mapping.mapped_code,
        confidence: mapping.confidence,
        match_method: mapping.match_method as any,
        reasoning: mapping.reasoning,
        flags: mapping.should_flag
          ? [{ reason: 'Flagged by Gemini', severity: 'medium' }]
          : undefined,
        status: mapping.should_flag ? 'flagged_for_review' : 'mapped',
      });
    }
  }

  // Step 4: Check unmapped entries
  for (let i = 0; i < parsedResponse.unmapped.length; i++) {
    const unmapped = parsedResponse.unmapped[i];
    if (!unmapped.source_name) {
      errors.push(`Unmapped entry ${i} missing "source_name"`);
    }
    if (!unmapped.reason) {
      errors.push(`Unmapped entry ${i} missing "reason"`);
    }
  }

  // Step 5: Check errors array
  for (let i = 0; i < parsedResponse.errors.length; i++) {
    const err = parsedResponse.errors[i];
    if (!err.error_type) {
      errors.push(`Error entry ${i} missing "error_type"`);
    }
    if (!err.message) {
      errors.push(`Error entry ${i} missing "message"`);
    }
  }

  const isValid = errors.length === 0;

  return {
    is_valid: isValid,
    errors,
    warnings,
    parsedResponse,
    processedMappings: validMappings,
    validationDetails: {
      structureValid: true,
      codesValid: errors.filter((e) => e.includes('Invalid code')).length === 0,
      confidenceValid: errors.filter((e) => e.includes('confidence')).length === 0,
      sourceCoursesMatched: errors.filter((e) => e.includes('source_name')).length === 0,
    },
  };
}

// ============================================================================
// INDIVIDUAL VALIDATORS
// ============================================================================

/**
 * Validates a single mapping from Gemini response
 */
function validateMapping(
  mapping: any,
  constraints: MappingConstraints,
  sourceCoursesMap: Map<string, ExtractedCourse>,
  index: number
): string[] {
  const errors: string[] = [];

  // Required fields
  if (!mapping.source_name || typeof mapping.source_name !== 'string') {
    errors.push(`Mapping ${index}: Missing or invalid "source_name"`);
    return errors; // Can't continue without this
  }

  if (!mapping.mapped_code || typeof mapping.mapped_code !== 'string') {
    errors.push(`Mapping ${index}: Missing or invalid "mapped_code"`);
    return errors; // Can't continue without this
  }

  if (
    typeof mapping.confidence !== 'number' ||
    !Number.isInteger(mapping.confidence)
  ) {
    errors.push(
      `Mapping ${index} (${mapping.source_name}): Confidence must be integer, got ${typeof mapping.confidence}`
    );
  }

  if (!mapping.reasoning || typeof mapping.reasoning !== 'string') {
    errors.push(`Mapping ${index} (${mapping.source_name}): Missing "reasoning"`);
  }

  if (!mapping.match_method) {
    errors.push(
      `Mapping ${index} (${mapping.source_name}): Missing "match_method"`
    );
  }

  // Validate code against constraint list
  const normalizedCode = normalize(mapping.mapped_code);
  const validCodesNormalized = constraints.valid_codes.map(normalize);

  if (!validCodesNormalized.includes(normalizedCode)) {
    // This is a critical error - Gemini hallucinated a code
    errors.push(
      `Mapping ${index} (${mapping.source_name}): INVALID CODE "${mapping.mapped_code}" - not in master database`
    );
  }

  // Validate confidence range
  if (mapping.confidence < 0 || mapping.confidence > 100) {
    errors.push(
      `Mapping ${index} (${mapping.source_name}): Confidence ${mapping.confidence} outside 0-100 range`
    );
  }

  // Validate match_method
  const validMethods = [
    'CODE_MATCH',
    'CODE_TRIM_MATCH',
    'NAME_MATCH',
    'SEMANTIC_MATCH',
  ];
  if (!validMethods.includes(mapping.match_method)) {
    errors.push(
      `Mapping ${index} (${mapping.source_name}): Invalid match_method "${mapping.match_method}"`
    );
  }

  // Validate that source_name matches one of input courses
  const normalizedSourceName = normalize(mapping.source_name);
  if (!sourceCoursesMap.has(normalizedSourceName)) {
    errors.push(
      `Mapping ${index}: Source name "${mapping.source_name}" doesn't match any input course`
    );
  }

  // Validate should_flag is boolean
  if (typeof mapping.should_flag !== 'boolean') {
    errors.push(
      `Mapping ${index} (${mapping.source_name}): "should_flag" must be boolean`
    );
  }

  // Optional fields validation
  if (mapping.alternative_matches && !Array.isArray(mapping.alternative_matches)) {
    errors.push(
      `Mapping ${index} (${mapping.source_name}): "alternative_matches" must be array`
    );
  }

  if (mapping.alternative_matches && Array.isArray(mapping.alternative_matches)) {
    for (const altCode of mapping.alternative_matches) {
      const normalizedAltCode = normalize(altCode);
      if (!validCodesNormalized.includes(normalizedAltCode)) {
        errors.push(
          `Mapping ${index} (${mapping.source_name}): Alternative code "${altCode}" is invalid`
        );
      }
    }
  }

  return errors;
}

/**
 * Validates Gemini input before sending
 */
export function validateGeminiInput(
  courses: ExtractedCourse[],
  masterCatalog: Array<{ course_code: string }>,
  options?: {
    maxCourses?: number;
    maxTokens?: number;
  }
): ValidationResult {
  const { maxCourses = 100, maxTokens = 100000 } = options || {};
  const errors: string[] = [];

  // Check courses array
  if (!Array.isArray(courses) || courses.length === 0) {
    errors.push('Courses array is empty or not an array');
    return { is_valid: false, errors };
  }

  if (courses.length > maxCourses) {
    errors.push(
      `Too many courses: ${courses.length} > ${maxCourses} max allowed`
    );
  }

  // Check each course
  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];

    if (!course.name || typeof course.name !== 'string') {
      errors.push(`Course ${i}: Missing or invalid "name" field`);
    }

    if (course.name && course.name.length > 500) {
      errors.push(`Course ${i}: Name is too long (> 500 chars)`);
    }

    if (
      course.description &&
      typeof course.description !== 'string'
    ) {
      errors.push(`Course ${i}: Invalid "description" (must be string)`);
    }

    if (
      course.description &&
      course.description.length > 2000
    ) {
      errors.push(`Course ${i}: Description is too long (> 2000 chars)`);
    }
  }

  // Check master catalog
  if (!Array.isArray(masterCatalog) || masterCatalog.length === 0) {
    errors.push('Master catalog is empty or not an array');
  }

  // Estimate tokens
  const estimatedTokens =
    courses.reduce((sum, c) => sum + (c.name?.length || 0) + (c.description?.length || 0), 0) / 4 +
    masterCatalog.length * 10;

  if (estimatedTokens > maxTokens) {
    errors.push(
      `Estimated tokens ${Math.ceil(estimatedTokens)} > ${maxTokens} max allowed`
    );
  }

  return {
    is_valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// SAFETY CHECKS
// ============================================================================

/**
 * Check if response contains any hallucinated codes
 */
export function detectHallucinatedCodes(
  mappings: Array<{ mapped_code: string }>,
  validCodes: string[]
): { hallucinated: string[]; percentage: number } {
  const validCodesSet = new Set(validCodes.map(normalize));
  const hallucinated: string[] = [];

  for (const mapping of mappings) {
    if (!validCodesSet.has(normalize(mapping.mapped_code))) {
      hallucinated.push(mapping.mapped_code);
    }
  }

  return {
    hallucinated: Array.from(new Set(hallucinated)),
    percentage:
      mappings.length > 0 ? (hallucinated.length / mappings.length) * 100 : 0,
  };
}

/**
 * Check if any mappings have suspiciously low/high confidence
 */
export function detectConfidenceAnomalies(
  mappings: Array<{ confidence: number }>,
  options?: {
    suspiciouslyHighThreshold?: number;
    suspiciouslyLowThreshold?: number;
  }
): {
  tooHigh: number;
  tooLow: number;
  warnings: string[];
} {
  const {
    suspiciouslyHighThreshold = 98,
    suspiciouslyLowThreshold = 20,
  } = options || {};

  let tooHigh = 0;
  let tooLow = 0;
  const warnings: string[] = [];

  for (const mapping of mappings) {
    if (mapping.confidence > suspiciouslyHighThreshold) {
      tooHigh++;
    }
    if (mapping.confidence < suspiciouslyLowThreshold) {
      tooLow++;
    }
  }

  if (tooHigh > 0) {
    warnings.push(
      `${tooHigh} mappings have suspiciously high confidence (>${suspiciouslyHighThreshold}%)`
    );
  }

  if (tooLow > 0) {
    warnings.push(
      `${tooLow} mappings have suspiciously low confidence (<${suspiciouslyLowThreshold}%)`
    );
  }

  return { tooHigh, tooLow, warnings };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize text for comparison (lowercase, remove special chars)
 */
function normalize(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, '')
    .trim();
}

/**
 * Log validation results for debugging
 */
export function logValidationResult(
  result: ValidationResult,
  context?: { sessionId?: string; courseCount?: number }
): void {
  const timestamp = new Date().toISOString();
  const contextStr = context ? JSON.stringify(context) : 'N/A';

  if (result.is_valid) {
    console.log(`[${timestamp}] ✓ Validation passed - ${contextStr}`);
  } else {
    console.error(`[${timestamp}] ✗ Validation failed - ${contextStr}`);
    console.error('Errors:');
    result.errors.forEach((e) => console.error(`  - ${e}`));
    if (result.warnings) {
      console.warn('Warnings:');
      result.warnings.forEach((w) => console.warn(`  - ${w}`));
    }
  }
}
