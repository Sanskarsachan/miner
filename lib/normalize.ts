/**
 * Normalize course data from various field name variants
 * Handles: name/CourseName, code/CourseCode, grade_level/GradeLevel, etc.
 */
export function normalizeCourse(c: any) {
  if (!c || typeof c !== 'object') {
    return getEmptyCourse();
  }

  // Map of possible field name variants for each field
  const getField = (variants: string[], fallback = '') => {
    for (const variant of variants) {
      const val = c[variant];
      if (val && typeof val === 'string' && val.trim() && val !== '-' && val !== 'null') {
        return val.trim();
      }
    }
    return fallback;
  };

  return {
    Category:
      getField(
        ['category', 'Category', 'CategoryName', 'subject', 'Subject', 'Department', 'department'],
        'Uncategorized'
      ) || 'Uncategorized',
    CourseName: getField(['name', 'CourseName', 'title', 'courseName', 'course_name', 'Name'], ''),
    CourseCode: getField(['code', 'CourseCode', 'course_id', 'courseCode', 'Code', 'ID', 'id'], ''),
    GradeLevel: getField(
      ['grade_level', 'GradeLevel', 'grade', 'Grade', 'level', 'gradeLevel'],
      '-'
    ),
    Length: getField(['length', 'Length', 'duration', 'Duration', 'semester', 'Semester'], '-'),
    Prerequisite: getField(['prerequisite', 'Prerequisite', 'prereq', 'Prereq'], '-'),
    Credit: getField(['credits', 'Credit', 'credit', 'Credits', 'units', 'Units'], '-'),
    Details: getField(['details', 'Details', 'additional_info', 'AdditionalInfo'], '-'),
    CourseDescription: getField(
      ['description', 'CourseDescription', 'Description', 'desc', 'overview', 'Overview'],
      ''
    ),
  };
}

export function getEmptyCourse() {
  return {
    Category: 'Uncategorized',
    CourseName: '',
    CourseCode: '',
    GradeLevel: '-',
    Length: '-',
    Prerequisite: '-',
    Credit: '-',
    Details: '-',
    CourseDescription: '',
  };
}

/**
 * Split compound course entries (e.g., "English 1-4" → ["English 1", "English 2", "English 3", "English 4"])
 */
export function splitCompoundCourse(course: any) {
  const nc = normalizeCourse(course);
  const courseName = nc.CourseName || '';

  // Pattern: "Subject Number1-Number2" (e.g., "English 1-4", "Math 101-102")
  const compoundMatch = courseName.match(/^(.+?)\s*(\d+)\s*-\s*(\d+)$/);
  if (!compoundMatch) {
    return [nc]; // No splitting needed
  }

  const [_, subject, startStr, endStr] = compoundMatch;
  const start = parseInt(startStr);
  const end = parseInt(endStr);

  // Sanity check: don't split if range is too large
  if (end - start > 10) {
    return [nc];
  }

  const courses = [];
  for (let i = start; i <= end; i++) {
    courses.push({
      ...nc,
      CourseName: `${subject.trim()} ${i}`,
    });
  }
  return courses;
}

/**
 * Clean and normalize all courses in a batch
 */
export function cleanAndNormalizeCourses(courses: any[]) {
  if (!Array.isArray(courses)) return [];

  const cleaned: any[] = [];

  for (const course of courses) {
    try {
      const split = splitCompoundCourse(course);
      cleaned.push(...split);
    } catch (err) {
      // Fallback to normalized course without splitting
      const nc = normalizeCourse(course);
      if (nc.CourseName) {
        // Only add if has a course name
        cleaned.push(nc);
      }
    }
  }

  // Remove duplicates based on CourseName + CourseCode
  const unique = new Map<string, any>();
  for (const c of cleaned) {
    const key = `${c.CourseName}|${c.CourseCode}`;
    if (!unique.has(key)) {
      unique.set(key, c);
    }
  }

  return Array.from(unique.values());
}
