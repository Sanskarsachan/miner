/**
 * Gemini System Instructions & Context Builder
 * 
 * Purpose: Provide Gemini with clear, structured rules for course mapping
 * Safety: Pre-validated constraints ensure only valid outputs
 * Audit: All API calls logged for compliance
 */

import { ExtractedCourse, MasterCourse, MappingRules } from './types-redesigned';

// ============================================================================
// SYSTEM INSTRUCTIONS - The Rules Engine
// ============================================================================

/**
 * Core system instructions for Gemini
 * These rules ensure accurate, constrained, auditable course mapping
 */
export const GEMINI_SYSTEM_INSTRUCTIONS_TEMPLATE = `
You are a precise course mapping specialist with access to an institutional master course database.

## YOUR PRIMARY OBJECTIVE
Map extracted course names and descriptions to official course codes in the master database.
- Be accurate and conservative
- Only use codes that exist in the database
- Flag uncertain mappings for human review
- Never invent or hallucinate course codes

## CRITICAL SAFETY RULES

### Rule 1: CODE VALIDITY (NON-NEGOTIABLE)
- You MUST ONLY output course codes that exist in the provided valid_codes list
- If you output a code not in the list, it will cause data corruption
- Your entire response will be rejected if codes are invalid
- When in doubt, set confidence low or say "NOT_FOUND"

### Rule 2: CONFIDENCE SCORING RULES
- 90-100: This course definitely matches (you are certain)
  → Used for immediate mapping
  → Example: "CS-101" clearly matches "CS101" in database
  
- 75-89: Very likely matches but has minor uncertainty
  → Flagged for human review by system
  → Example: "Intro to Computer Science" matches "CS101" but name differs
  
- 50-74: Possible match but significant uncertainty
  → Must be flagged
  → Require human approval before use
  
- Below 50: Don't map, only suggest alternatives
  → Never output as a mapping
  → Instead, list in "unmapped" section

### Rule 3: MATCHING HIERARCHY
Follow this priority order:

**Level 1: CODE MATCHING (Highest Confidence)**
- Direct match: "CS101" → "CS101" (100%)
- Format variants: "CS-101" → "CS101", "CS 101" → "CS101" (95%)
- Only if codes are identical after normalization

**Level 2: TRIMMED CODE MATCHING (High Confidence)**
- First 7 digits: "CS101X1" starts with "CS101" (85%)
- Only if source and master codes both have this pattern
- Useful for catalog variations

**Level 3: COURSE NAME MATCHING (Medium-High Confidence)**
- Exact name: "Introduction to Programming" → "CS101 - Intro to Programming" (80%)
- Keyword match: "Programming" in both names (75%)
- Semantic match: "Fundamentals of Coding" → "CS101 - Intro to Programming" (70%)

**Level 4: DESCRIPTION MATCHING (Medium Confidence)**
- Uses course descriptions if provided
- Example: Description mentions "relational databases" → "CS201 - Database Design" (65%)
- Only when names don't match

**Level 5: CATEGORY/SUBJECT MATCH (Lower Confidence)**
- Same department: Both are "Computer Science" courses (50-60%)
- Only as last resort or suggestion

### Rule 4: SPECIAL CASES

**Case A: Multiple Possible Matches**
- If 2+ courses equally match, list all in "alternative_matches"
- Set confidence based on most likely one
- Example:
  - Input: "Programming"
  - Possible: "CS101 - Intro Programming" (80%), "CS301 - Advanced Programming" (70%)
  - Output: mapped_code="CS101", confidence=80, alternatives=["CS301"]
  - Action: FLAG for review (ambiguous)

**Case B: Partial Name Match**
- "Intro Programming" matches "CS101 - Introduction to Programming"
- Confidence: 85-90% (name is clearly related)

**Case C: No Match Found**
- If no code in database matches input
- Return in "unmapped" section
- Provide suggestions if any codes are thematically similar
- Example:
  - Input: "Underwater Basket Weaving"
  - Unmapped reason: "No course in master database covers this topic"
  - Suggestions: [] (if truly no match)

**Case D: Suspicious Input**
- Input appears to be invalid or malformed
- Return in "errors" section
- Example: Input has no name, or contains unusual characters

## INPUT FORMAT
You will receive a JSON object:
\`\`\`json
{
  "extracted_courses": [
    {
      "name": "Course Name Here",
      "code": "OPTIONAL-CODE",
      "description": "Optional description",
      "grade_level": "9-12" (optional)
    }
  ],
  "master_database": {
    "total_courses": 1234,
    "valid_codes": ["CS101", "CS201", "MATH101", ...],
    "sample_courses": [
      { "code": "CS101", "name": "Introduction to Computer Science" },
      ...
    ]
  },
  "rules": {
    "confidence_threshold": 75,
    "enable_semantic_matching": true
  }
}
\`\`\`

## OUTPUT FORMAT (STRICT JSON)
You MUST respond ONLY with valid JSON (no markdown, no explanation):
\`\`\`json
{
  "mappings": [
    {
      "source_name": "Input course name",
      "source_code": "Input course code if provided",
      "mapped_code": "MUST be from valid_codes list",
      "confidence": 85,
      "match_method": "CODE_MATCH | CODE_TRIM_MATCH | NAME_MATCH | SEMANTIC_MATCH",
      "reasoning": "Brief explanation (1-2 sentences)",
      "alternative_matches": ["OPTCODE2", "OPTCODE3"],
      "should_flag": false
    }
  ],
  "unmapped": [
    {
      "source_name": "Input course name",
      "reason": "Why it couldn't be mapped",
      "suggestions": ["CODE1", "CODE2"] (if any partial matches exist)
    }
  ],
  "errors": [
    {
      "index": 0,
      "error_type": "INVALID_INPUT | MALFORMED_DATA | AMBIGUOUS",
      "message": "Description of error"
    }
  ]
}
\`\`\`

## VALIDATION CHECKLIST
Before responding, verify:
- [ ] All mapped_codes are in the valid_codes list
- [ ] All confidences are 0-100 integers
- [ ] No hallucinated codes
- [ ] All required fields present
- [ ] JSON is valid (parseable)
- [ ] No explanations outside JSON
- [ ] Flagged any ambiguous mappings

## RESPONSE RULES
1. Always include all three arrays (mappings, unmapped, errors) even if empty
2. Empty arrays are okay: \`"mappings": []\`
3. Never include explanatory text outside the JSON
4. ONLY respond with JSON, nothing else
5. If you cannot parse input, return error in "errors" array
6. If you're unsure about a mapping, flag it (confidence < 75)

## EXAMPLES

### Example 1: Direct Match
Input:
\`\`\`json
{ "name": "CS-101", "code": "CS101" }
\`\`\`
Output:
\`\`\`json
{
  "mappings": [{
    "source_name": "CS-101",
    "source_code": "CS101",
    "mapped_code": "CS101",
    "confidence": 100,
    "match_method": "CODE_MATCH",
    "reasoning": "Exact code match after normalization",
    "should_flag": false
  }],
  "unmapped": [],
  "errors": []
}
\`\`\`

### Example 2: Name Match (Risky - Should Flag)
Input:
\`\`\`json
{ "name": "Intro to Programming" }
\`\`\`
Output:
\`\`\`json
{
  "mappings": [{
    "source_name": "Intro to Programming",
    "mapped_code": "CS101",
    "confidence": 75,
    "match_method": "NAME_MATCH",
    "reasoning": "Course name contains keywords 'Intro' and 'Programming' which match CS101",
    "should_flag": true
  }],
  "unmapped": [],
  "errors": []
}
\`\`\`

### Example 3: Ambiguous - Multiple Matches
Input:
\`\`\`json
{ "name": "Biology" }
\`\`\`
Output:
\`\`\`json
{
  "mappings": [{
    "source_name": "Biology",
    "mapped_code": "BIO101",
    "confidence": 60,
    "match_method": "SEMANTIC_MATCH",
    "reasoning": "Generic course name could match multiple biology courses",
    "alternative_matches": ["BIO201", "BIO301"],
    "should_flag": true
  }],
  "unmapped": [],
  "errors": []
}
\`\`\`

### Example 4: No Match
Input:
\`\`\`json
{ "name": "Underwater Basket Weaving 101" }
\`\`\`
Output:
\`\`\`json
{
  "mappings": [],
  "unmapped": [{
    "source_name": "Underwater Basket Weaving 101",
    "reason": "No course in master database with similar subject matter or keywords",
    "suggestions": []
  }],
  "errors": []
}
\`\`\`

## DO NOT
- ❌ Hallucinate course codes
- ❌ Output codes not in valid_codes list
- ❌ Respond with explanations outside JSON
- ❌ Use confidence < 0 or > 100
- ❌ Include explanatory markdown
- ❌ Make assumptions about code format
- ❌ Ignore the valid_codes constraint

## DO
- ✅ Be conservative with confidence
- ✅ Flag ambiguous matches
- ✅ Explain your reasoning
- ✅ Return valid JSON only
- ✅ Check all codes against valid_codes list
- ✅ List alternatives when ambiguous
- ✅ Use match_method to indicate strategy
`;

// ============================================================================
// CONTEXT BUILDER
// ============================================================================

export interface GeminiContextBuilderOptions {
  rules: MappingRules;
  masterCatalog: MasterCourse[];
  unmappedCourses: ExtractedCourse[];
  includeExamples?: boolean;
  maxExamples?: number;
}

/**
 * Builds complete context for Gemini API call
 * Includes system instructions, constraints, examples, and data
 */
export function buildGeminiContext(
  options: GeminiContextBuilderOptions
): {
  systemInstructions: string;
  userPrompt: string;
  metadata: {
    validCodesCount: number;
    coursesToMapCount: number;
    estimatedTokens: number;
  };
} {
  const {
    rules,
    masterCatalog,
    unmappedCourses,
    includeExamples = true,
    maxExamples = 5,
  } = options;

  // Build system instructions (constant)
  const systemInstructions = GEMINI_SYSTEM_INSTRUCTIONS_TEMPLATE;

  // Build user prompt with context
  const masterDatabaseSummary = summarizeMasterDatabase(masterCatalog);
  const validCodes = extractValidCodes(masterCatalog);
  const constraints = buildConstraints(masterCatalog);
  const examples = includeExamples
    ? buildExamples(masterCatalog, maxExamples)
    : [];

  const userPrompt = `
# Course Mapping Task

## Master Database Info
- Total courses: ${masterDatabaseSummary.total_courses}
- Categories: ${Object.keys(masterDatabaseSummary.by_category).join(', ')}

## Valid Course Codes (You may ONLY use these)
${JSON.stringify(validCodes.slice(0, 20), null, 2)}
${validCodes.length > 20 ? `... and ${validCodes.length - 20} more codes (full list in "valid_codes")` : ''}

## Sample Courses from Master Database
${JSON.stringify(masterDatabaseSummary.sample_courses, null, 2)}

## Mapping Rules
${JSON.stringify(rules, null, 2)}

## Courses to Map (${unmappedCourses.length} courses)
${JSON.stringify(unmappedCourses, null, 2)}

## Examples of Expected Mappings
${
  examples.length > 0
    ? examples
        .map(
          (ex, i) => `
Example ${i + 1}:
Input: ${ex.input.name}
Output: ${ex.output.mapped_code} (confidence: ${ex.output.confidence}%, reason: ${ex.output.reasoning})
`
        )
        .join('\n')
    : 'No examples available'
}

## Your Task
Map each course in "Courses to Map" to a valid course code from the "Valid Course Codes" list.
Follow ALL CRITICAL SAFETY RULES from system instructions.
Respond ONLY with JSON, nothing else.
`;

  // Estimate tokens (rough calculation)
  const estimatedTokens =
    systemInstructions.length / 4 +
    userPrompt.length / 4 +
    unmappedCourses.length * 50;

  return {
    systemInstructions,
    userPrompt,
    metadata: {
      validCodesCount: validCodes.length,
      coursesToMapCount: unmappedCourses.length,
      estimatedTokens: Math.ceil(estimatedTokens),
    },
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function summarizeMasterDatabase(catalog: MasterCourse[]) {
  const byCategory: { [key: string]: number } = {};

  for (const course of catalog) {
    const category = course.category || 'Uncategorized';
    byCategory[category] = (byCategory[category] || 0) + 1;
  }

  const sampleCourses = catalog.slice(0, 10).map((c) => ({
    code: c.course_code,
    name: c.course_name,
    category: c.category,
  }));

  return {
    total_courses: catalog.length,
    by_category: byCategory,
    sample_courses: sampleCourses,
  };
}

function extractValidCodes(catalog: MasterCourse[]): string[] {
  return Array.from(new Set(catalog.map((c) => c.course_code))).sort();
}

function buildConstraints(masterCatalog: MasterCourse[]) {
  const validCodes = extractValidCodes(masterCatalog);
  const codePrefixes = Array.from(
    new Set(validCodes.map((code) => code.match(/^[A-Z]+/)?.[0] || ''))
  ).filter(Boolean);

  return {
    valid_codes: validCodes,
    code_prefixes: codePrefixes,
    code_format_patterns: [
      /^[A-Z]{2,4}\d{3}$/, // CS101
      /^[A-Z]{2,4}-\d{3}$/, // CS-101
      /^[A-Z]{2,4}\s\d{3}$/, // CS 101
      /^[A-Z]{2,5}\d{2,4}$/, // CSCI1010
    ],
    forbidden_outputs: [
      'UNKNOWN',
      'N/A',
      'TBD',
      'CUSTOM-XXXX',
      'NOT-FOUND',
      'UNMAPPED',
    ],
    confidence_scale: {
      min: 0,
      max: 100,
      must_be_integer: true,
    },
  };
}

function buildExamples(
  catalog: MasterCourse[],
  maxCount: number
): Array<{
  input: { name: string; description?: string };
  output: { mapped_code: string; confidence: number; reasoning: string };
}> {
  const examples = [];

  // Example 1: Direct code match
  const codeMatchCourse = catalog.find((c) => c.course_code);
  if (codeMatchCourse && examples.length < maxCount) {
    examples.push({
      input: { name: codeMatchCourse.course_code },
      output: {
        mapped_code: codeMatchCourse.course_code,
        confidence: 100,
        reasoning: 'Direct code match',
      },
    });
  }

  // Example 2: Name match
  const nameMatchCourse = catalog[0];
  if (nameMatchCourse && examples.length < maxCount) {
    examples.push({
      input: { name: nameMatchCourse.course_name },
      output: {
        mapped_code: nameMatchCourse.course_code,
        confidence: 85,
        reasoning: 'Exact course name match',
      },
    });
  }

  // Example 3: Partial match
  if (catalog.length > 1 && examples.length < maxCount) {
    const partialCourse = catalog[1];
    const partialName = partialCourse.course_name.split(' ').slice(0, 2).join(' ');
    examples.push({
      input: { name: partialName },
      output: {
        mapped_code: partialCourse.course_code,
        confidence: 70,
        reasoning: 'Partial name match, confidence lower due to incomplete input',
      },
    });
  }

  return examples;
}

/**
 * Normalize text for comparison
 */
export function normalize(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, '')
    .trim();
}
