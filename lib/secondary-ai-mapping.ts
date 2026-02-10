/**
 * Secondary AI Mapping - Gemini-Based Course Cleaning & Suggestion
 * 
 * Purpose: Provide AI-first course mapping suggestions WITHOUT modifying primary mapping
 * 
 * Key Design Principle:
 * - This is PURELY SUGGESTIVE
 * - All results are stored in courses[].secondaryMapping
 * - Primary mapping logic remains untouched
 * - Users can compare primary vs secondary results
 * - Reversible and non-destructive
 */

import { SecondaryMapping } from './types-redesigned';

export interface MasterCourse {
  courseCode: string;
  courseName: string;
  courseTitle: string;
  category: string;
  level?: string;
  [key: string]: any;
}

export interface CourseForSecondaryMapping {
  name: string;
  code?: string;
  description?: string;
  grade_level?: string;
  category?: string;
}

export interface GeminiSecondaryMappingRequest {
  courses: CourseForSecondaryMapping[];
  masterCatalog: MasterCourse[];
  gradeContext?: string;
  apiKey: string;
  dryRun?: boolean;
}

export interface GeminiSecondaryResponse {
  course_name: string;
  cleaned_title: string;
  suggested_code: string;
  suggested_name: string;
  confidence: number; // 0-100
  reasoning: string;
  alternative_suggestions?: Array<{
    code: string;
    name: string;
    confidence: number;
  }>;
}

/**
 * Build the Gemini system prompt for secondary AI mapping
 * This is DIFFERENT from the primary mapping prompt - it's AI-first, not deterministic-first
 */
export function buildSecondaryMappingSystemPrompt(): string {
  return `You are an expert AI course assistant specialized in identifying and mapping educational courses.

## YOUR ROLE
You analyze extracted course names and descriptions using AI intelligence to:
1. Clean and normalize course titles
2. Suggest the most likely matching course from a master database
3. Provide confidence scores and reasoning

## KEY PRINCIPLES
- Be helpful and suggestive, not definitive
- Always provide reasoning for your suggestions
- Include alternatives if the mapping is uncertain
- Handle variations in course naming (abbreviations, different formats)
- Consider grade level and course context when available

## CONFIDENCE SCORING
- 95-100: Extremely certain (name match is exact or nearly exact)
- 85-94: Very confident (clear semantic match with course standards)
- 75-84: Confident (good match but some uncertainty remains)
- 65-74: Moderate confidence (reasonable suggestion, human review advised)
- 50-64: Low confidence (possible match, needs verification)
- Below 50: Very uncertain (suggest alternatives only)

## OUTPUT FORMAT
Return valid JSON array with NO extra text. Example:
[
  {
    "course_name": "Introduction to Biology",
    "cleaned_title": "Biology I",
    "suggested_code": "2000310",
    "suggested_name": "Biology 1",
    "confidence": 92,
    "reasoning": "Exact match for introductory biology course. Title cleaned to standard format.",
    "alternative_suggestions": [
      {"code": "2000320", "name": "Biology 1 Honors", "confidence": 45}
    ]
  }
]

## SAFETY RULES
- Return ONLY valid JSON
- All confidence scores must be integers 0-100
- Never invent course codes not in the provided list
- If uncertain, suggest alternatives with lower confidence
- Always include a reasoning string
`;
}

/**
 * Build the user prompt with course data for Gemini
 */
export function buildSecondaryMappingUserPrompt(
  courses: CourseForSecondaryMapping[],
  masterCatalog: MasterCourse[],
  gradeContext?: string
): string {
  const catalogText = masterCatalog
    .map(
      (m) => `${m.courseCode}: ${m.courseName} (${m.courseTitle}) [${m.category}]`
    )
    .join('\n');

  const courseTexts = courses
    .map(
      (c) => `
Course Name: ${c.name}
Code: ${c.code || 'N/A'}
Description: ${c.description || 'N/A'}
Grade Level: ${c.grade_level || 'N/A'}
Category: ${c.category || 'N/A'}
---`
    )
    .join('\n');

  return `## MASTER COURSE DATABASE
${catalogText}

## COURSES TO MAP
${courseTexts}

${gradeContext ? `## GRADE CONTEXT\n${gradeContext}\n` : ''}

## TASK
For each course above, suggest the best matching master course code and provide reasoning.
Return results as a JSON array with the format shown in the system prompt.
If a course doesn't match any master course well, set confidence below 50 and suggest alternatives.

RETURN ONLY VALID JSON, NO OTHER TEXT.`;
}

/**
 * Call Gemini to get secondary mapping suggestions
 */
export async function callGeminiForSecondaryMapping(
  courses: CourseForSecondaryMapping[],
  masterCatalog: MasterCourse[],
  apiKey: string,
  gradeContext?: string
): Promise<GeminiSecondaryResponse[]> {
  if (!apiKey) {
    throw new Error('Gemini API key is required');
  }

  if (courses.length === 0) {
    return [];
  }

  try {
    const systemPrompt = buildSecondaryMappingSystemPrompt();
    const userPrompt = buildSecondaryMappingUserPrompt(
      courses,
      masterCatalog,
      gradeContext
    );

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3, // Lower temperature for more consistent results
          maxOutputTokens: 4000,
          topK: 40,
          topP: 0.95,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Secondary Mapping] Gemini API Error:', errorData);
      throw new Error(
        `Gemini API error: ${response.statusText} - ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();

    // Extract the text response
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
      throw new Error('No response from Gemini');
    }

    // Parse JSON response
    const cleanedText = textContent.trim();
    let parsedResults: GeminiSecondaryResponse[];

    try {
      parsedResults = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('[Secondary Mapping] Failed to parse Gemini response:', cleanedText);
      throw new Error(
        `Failed to parse Gemini response as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`
      );
    }

    // Validate structure
    if (!Array.isArray(parsedResults)) {
      throw new Error('Gemini response is not an array');
    }

    return parsedResults;
  } catch (error) {
    console.error('[Secondary Mapping] Error calling Gemini:', error);
    throw error;
  }
}

/**
 * Convert Gemini response to SecondaryMapping objects
 */
export function geminiResponseToSecondaryMapping(
  geminiResponse: GeminiSecondaryResponse,
  aiModel: string = 'gemini-2-flash'
): SecondaryMapping {
  return {
    cleanedTitle: geminiResponse.cleaned_title,
    suggestedCode: geminiResponse.suggested_code,
    suggestedName: geminiResponse.suggested_name,
    confidence: Math.min(100, Math.max(0, geminiResponse.confidence)), // Ensure 0-100
    reasoning: geminiResponse.reasoning,
    alternativeSuggestions: geminiResponse.alternative_suggestions,
    aiModel,
    runAt: new Date(),
  };
}

/**
 * Main function: Run secondary AI mapping for a list of courses
 */
export async function runSecondaryAIMapping(
  request: GeminiSecondaryMappingRequest
): Promise<Array<{ original: CourseForSecondaryMapping; secondary: SecondaryMapping }>> {
  const geminiResponses = await callGeminiForSecondaryMapping(
    request.courses,
    request.masterCatalog,
    request.apiKey,
    request.gradeContext
  );

  // Map responses back to courses
  const results = request.courses.map((course, index) => {
    const geminiResult = geminiResponses[index];

    if (!geminiResult) {
      // Fallback if Gemini didn't return all results
      return {
        original: course,
        secondary: {
          cleanedTitle: course.name,
          suggestedCode: 'UNMAPPED',
          confidence: 0,
          reasoning: 'No suggestion generated',
          aiModel: 'gemini-2-flash',
          runAt: new Date(),
        },
      };
    }

    return {
      original: course,
      secondary: geminiResponseToSecondaryMapping(geminiResult),
    };
  });

  return results;
}

/**
 * Prepare courses for secondary mapping
 * Extract only necessary fields to minimize API calls
 */
export function prepareCourseDataForSecondaryMapping(
  courses: any[]
): CourseForSecondaryMapping[] {
  return courses.map((c) => ({
    name: c.name || c.CourseName || c.course_name || '',
    code: c.code || c.CourseCode || c.course_code,
    description: c.description || c.CourseDescription,
    grade_level: c.grade_level || c.GradeLevel,
    category: c.category || c.Category,
  }));
}
