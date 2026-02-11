/**
 * Mapping Engine: 6-Step Course Mapping System
 * Deterministic → Semantic → Validation → Persistence → UI Response
 */

import { Db, ObjectId } from 'mongodb';

export interface MasterCourse {
  _id?: string;
  courseCode: string;
  courseName: string;
  courseAbbrevTitle?: string;
  courseTitle: string;
  category: string;
  subCategory?: string;
  programSubjectArea?: string;
  gradeLevel?: string;
  courseLevel?: string;
  courseDuration?: string;
  courseTerm?: string;
  graduationRequirement?: string;
  description?: string;
  credits?: string;
  credit?: string;
  certification?: string;
  filename?: string;
  [key: string]: any;
}

export interface ExtractedCourse {
  _id?: string;
  CourseName: string;
  CourseCode: string;
  CourseDescription?: string;
  GradeLevel?: string;
  Length?: string;
  Credit?: string;
  mappedProgramSubjectArea?: string;
  mappedCode?: string;
  mappingStatus?: 'unmapped' | 'mapped' | 'flagged_for_review';
  matchMethod?: 'CODE_MATCH' | 'CODE_TRIM_MATCH' | 'SEMANTIC_MATCH';
  matchReasoning?: string;
  confidence?: number;
  [key: string]: any;
}

export interface MappingResult {
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

/**
 * STEP 1: Normalization Function
 * Removes all whitespace and special characters for comparison
 */
export function normalize(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, '')
    .trim();
}

/**
 * STEP 2: Deterministic Pass
 * Direct code matching (full and trimmed to first 7 digits)
 */
export async function deterministicPass(
  courses: ExtractedCourse[],
  masterCatalog: MasterCourse[]
): Promise<{
  updated: ExtractedCourse[];
  unmapped: ExtractedCourse[];
  stats: { codeMatches: number; trimMatches: number };
}> {
  const masterCodeSet = new Map(
    masterCatalog.map((m) => [normalize(m.courseCode), m])
  );

  const updated: ExtractedCourse[] = [];
  const unmapped: ExtractedCourse[] = [];
  let codeMatches = 0;
  let trimMatches = 0;

  for (const course of courses) {
    const normalized = normalize(course.CourseCode);

    // Match A: Direct code match
    if (masterCodeSet.has(normalized)) {
      const matchedCourse = masterCodeSet.get(normalized);
      updated.push({
        ...course,
        mappedCode: matchedCourse?.courseCode,
        mappedProgramSubjectArea: matchedCourse?.programSubjectArea,
        mappingStatus: 'mapped',
        matchMethod: 'CODE_MATCH',
        confidence: 100,
      });
      codeMatches++;
      continue;
    }

    // Match B: Trim to first 7 digits and compare
    const trimmed = normalized.substring(0, 7);
    const trimmedMatch = Array.from(masterCodeSet.entries()).find(
      ([code]) => code.substring(0, 7) === trimmed
    );

    if (trimmedMatch) {
      updated.push({
        ...course,
        mappedCode: trimmedMatch[1].courseCode,
        mappedProgramSubjectArea: trimmedMatch[1].programSubjectArea,
        mappingStatus: 'mapped',
        matchMethod: 'CODE_TRIM_MATCH',
        confidence: 85,
      });
      trimMatches++;
      continue;
    }

    // No match - add to unmapped for semantic pass
    unmapped.push(course);
  }

  return {
    updated,
    unmapped,
    stats: { codeMatches, trimMatches },
  };
}

/**
 * STEP 3: Semantic Pass
 * Uses Gemini AI to find semantic matches
 */
export async function semanticPass(
  unmappedCourses: ExtractedCourse[],
  masterCatalog: MasterCourse[],
  apiKey: string
): Promise<ExtractedCourse[]> {
  if (unmappedCourses.length === 0) return [];

  try {
    // Prepare batch for Gemini
    const courseBatch = unmappedCourses.map((course) => ({
      rawName: course.CourseName,
      courseCode: course.CourseCode,
      description: course.CourseDescription || '',
    }));

    const masterCatalogText = masterCatalog
      .map((m) => `${m.courseCode}: ${m.courseName} - ${m.courseTitle}`)
      .join('\n');

    const systemInstruction = `You are an expert in Florida High School Curriculum. Your task is to map school-specific course titles and project descriptions to the correct 7-digit State Course Code.
Instructions:
1. Ignore all formatting, spaces, and minor typos.
2. Look for keywords in project descriptions that indicate a state standard (e.g., 'Quadratic equations' matches 'Algebra 2').
3. If a description involves '3D Printing' or 'Simulations' in a math context, look for Geometry or Physics codes.
4. Output Format: Return ONLY a JSON array: [{"rawName": string, "mappedCode": string, "confidence": number, "reasoning": string}].
5. If no clear match exists, return null for the mappedCode.`;

    const prompt = `Map these unmapped courses to the Florida State Course Codes:

MASTER CATALOG:
${masterCatalogText}

UNMAPPED COURSES:
${JSON.stringify(courseBatch, null, 2)}

Return ONLY valid JSON array with mappings.`;

    // Call Gemini API
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey,
        payload: {
          system: [{ text: systemInstruction }],
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      console.error('Gemini API error:', response.status);
      return unmappedCourses; // Return unmapped if API fails
    }

    const result = await response.json();
    let mappedResults: any[] = [];

    if (
      result.candidates &&
      result.candidates.length > 0 &&
      result.candidates[0].content
    ) {
      const content = result.candidates[0].content.parts[0]?.text || '';
      
      // Parse JSON from response (handle markdown code blocks)
      let jsonStr = content.trim();
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
      }

      try {
        mappedResults = JSON.parse(jsonStr);
      } catch (e) {
        console.error('JSON parse error:', e);
        return unmappedCourses;
      }
    }

    // Apply semantic mappings to unmapped courses
    const masterByCode = new Map(
      masterCatalog.map((m) => [normalize(m.courseCode), m])
    );

    return unmappedCourses.map((course) => {
      const mapping = mappedResults.find(
        (m: any) => normalize(m.rawName) === normalize(course.CourseName)
      );

      if (mapping && mapping.mappedCode) {
        const matchedMaster = masterByCode.get(normalize(mapping.mappedCode));
        return {
          ...course,
          mappedCode: mapping.mappedCode,
          mappedProgramSubjectArea: matchedMaster?.programSubjectArea,
          mappingStatus:
            mapping.confidence >= 75 ? 'mapped' : 'flagged_for_review',
          matchMethod: 'SEMANTIC_MATCH',
          matchReasoning: mapping.reasoning,
          confidence: mapping.confidence,
        };
      }

      return { ...course, mappingStatus: 'unmapped' };
    });
  } catch (err) {
    console.error('Semantic pass error:', err);
    return unmappedCourses.map((c) => ({
      ...c,
      mappingStatus: 'unmapped',
    }));
  }
}

/**
 * STEP 4: Validation Layer
 * Verifies all mapped codes exist in master catalog
 */
export function validateMappings(
  mappedCourses: ExtractedCourse[],
  masterCatalog: MasterCourse[]
): ExtractedCourse[] {
  const validCodes = new Set(masterCatalog.map((m) => normalize(m.courseCode)));
  const masterByCode = new Map(
    masterCatalog.map((m) => [normalize(m.courseCode), m])
  );

  return mappedCourses.map((course) => {
    if (!course.mappedCode) {
      return { ...course, mappingStatus: 'unmapped' };
    }

    const normalizedMapped = normalize(course.mappedCode);

    if (!validCodes.has(normalizedMapped)) {
      return {
        ...course,
        mappingStatus: 'flagged_for_review',
        matchReasoning: `Mapped code ${course.mappedCode} not found in master catalog`,
      };
    }

    const matchedMaster = masterByCode.get(normalizedMapped);
    return {
      ...course,
      mappedProgramSubjectArea:
        course.mappedProgramSubjectArea || matchedMaster?.programSubjectArea,
    };
  });
}

/**
 * STEP 5: MongoDB Persistence
 * Updates courses in extraction document using array filters
 */
export async function persistMappings(
  db: Db,
  extractionId: string,
  courses: ExtractedCourse[]
): Promise<void> {
  const collection = db.collection('extractions');

  for (const course of courses) {
    if (
      course.mappingStatus === 'mapped' ||
      course.mappingStatus === 'flagged_for_review'
    ) {
      // Use array filters for precise updates to array elements
      await collection.updateOne(
        { _id: new ObjectId(extractionId) },
        {
          $set: {
            'courses.$[elem].mappedCode': course.mappedCode,
            'courses.$[elem].mappedProgramSubjectArea': course.mappedProgramSubjectArea,
            'courses.$[elem].mappingStatus': course.mappingStatus,
            'courses.$[elem].matchMethod': course.matchMethod,
            'courses.$[elem].matchReasoning': course.matchReasoning,
            'courses.$[elem].confidence': course.confidence,
          },
        },
        {
          arrayFilters: [
            {
              'elem.CourseName': course.CourseName,
              'elem.CourseCode': course.CourseCode,
            },
          ],
        }
      );
    }
  }

  // Update parent document
  await collection.updateOne(
    { _id: new ObjectId(extractionId) },
    {
      $set: {
        is_refined: true,
        updated_at: new Date(),
      },
    }
  );
}

/**
 * STEP 6: Compute Summary Results
 * Prepares response object for frontend
 */
export function computeSummary(
  originalCourses: ExtractedCourse[],
  finalCourses: ExtractedCourse[],
  deterministicStats: { codeMatches: number; trimMatches: number }
): MappingResult {
  const mapped = finalCourses.filter((c) => c.mappingStatus === 'mapped');
  const flagged = finalCourses.filter(
    (c) => c.mappingStatus === 'flagged_for_review'
  );
  const unmapped = finalCourses.filter((c) => c.mappingStatus === 'unmapped');

  const semanticMatches = mapped.filter(
    (c) => c.matchMethod === 'SEMANTIC_MATCH'
  ).length;

  return {
    totalProcessed: originalCourses.length,
    newlyMapped: mapped.length,
    stillUnmapped: unmapped.length,
    flaggedForReview: flagged.length,
    details: {
      codeMatches: deterministicStats.codeMatches,
      trimMatches: deterministicStats.trimMatches,
      semanticMatches,
    },
  };
}
