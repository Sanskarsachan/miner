/**
 * Extraction Service
 * Handles all extraction-related database operations
 * v2 Feature: Save and manage extractions
 */

import { ObjectId } from 'mongodb'
import { getDB } from './db'
import { Extraction, ExtractionVersion, Course } from './types'

/**
 * Save a new extraction to database
 */
export async function saveExtraction(
  userId: string,
  extraction: Omit<Extraction, '_id' | 'created_at' | 'updated_at' | 'user_id'>
): Promise<Extraction> {
  const db = await getDB()
  const collection = db.collection('extractions')

  const newExtraction: Extraction = {
    ...extraction,
    user_id: new ObjectId(userId),
    created_at: new Date(),
    updated_at: new Date(),
  }

  const result = await collection.insertOne(newExtraction as any)

  return {
    ...newExtraction,
    _id: result.insertedId,
  }
}

/**
 * Get extraction by ID
 */
export async function getExtractionById(extractionId: string): Promise<Extraction | null> {
  const db = await getDB()
  return (await db.collection('extractions').findOne({
    _id: new ObjectId(extractionId),
  })) as Extraction | null
}

/**
 * Get user's extractions with pagination
 */
export async function getUserExtractions(
  userId: string,
  limit: number = 10,
  skip: number = 0
): Promise<{ extractions: Extraction[]; total: number }> {
  const db = await getDB()
  const collection = db.collection('extractions')

  const total = await collection.countDocuments({
    user_id: new ObjectId(userId),
  })

  const extractions = (await collection
    .find({
      user_id: new ObjectId(userId),
    })
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit)
    .toArray()) as Extraction[]

  return { extractions, total }
}

/**
 * Update extraction
 */
export async function updateExtraction(
  extractionId: string,
  updates: Partial<Extraction>
): Promise<Extraction | null> {
  const db = await getDB()

  const result = await db.collection('extractions').findOneAndUpdate(
    { _id: new ObjectId(extractionId) },
    {
      $set: {
        ...updates,
        updated_at: new Date(),
      },
    },
    { returnDocument: 'after' }
  )

  return result.value as Extraction | null
}

/**
 * Delete extraction by ID
 */
export async function deleteExtraction(extractionId: string): Promise<{ deletedCount: number }> {
  const db = await getDB()
  const result = await db.collection('extractions').deleteOne({
    _id: new ObjectId(extractionId),
  })

  return {
    deletedCount: result.deletedCount,
  }
}

/**
 * Create a new version of extraction
 */
export async function createVersion(
  extractionId: string,
  userId: string,
  changes: any,
  notes?: string
): Promise<ExtractionVersion> {
  const db = await getDB()
  const extractionCollection = db.collection('extractions')
  const versionCollection = db.collection('versions')

  // Get current extraction
  const extraction = (await extractionCollection.findOne({
    _id: new ObjectId(extractionId),
  })) as Extraction | null

  if (!extraction) {
    throw new Error('Extraction not found')
  }

  // Create version record
  const version: ExtractionVersion = {
    extraction_id: new ObjectId(extractionId),
    user_id: new ObjectId(userId),
    version_number: (extraction.current_version || 1) + 1,
    changes,
    total_courses: extraction.total_courses,
    refined_by: 'manual',
    created_at: new Date(),
    notes: notes || '',
  }

  const versionResult = await versionCollection.insertOne(version as any)

  // Update extraction version counter
  await extractionCollection.updateOne(
    { _id: new ObjectId(extractionId) },
    {
      $set: {
        current_version: version.version_number,
        updated_at: new Date(),
      },
    }
  )

  return {
    ...version,
    _id: versionResult.insertedId,
  }
}

/**
 * Get version history for extraction
 */
export async function getVersionHistory(extractionId: string): Promise<ExtractionVersion[]> {
  const db = await getDB()
  return (await db
    .collection('versions')
    .find({ extraction_id: new ObjectId(extractionId) })
    .sort({ version_number: -1 })
    .toArray()) as ExtractionVersion[]
}

/**
 * Get extraction by file hash
 */
export async function getExtractionByFileHash(
  userId: string,
  fileHash: string
): Promise<Extraction | null> {
  const db = await getDB()
  return (await db.collection('extractions').findOne({
    user_id: new ObjectId(userId),
    file_id: fileHash,
  })) as Extraction | null
}

/**
 * Update courses in extraction
 */
export async function updateExtractionCourses(
  extractionId: string,
  courses: Course[]
): Promise<Extraction | null> {
  return updateExtraction(extractionId, {
    courses,
    total_courses: courses.length,
  })
}

/**
 * Count user's extractions
 */
export async function countUserExtractions(userId: string): Promise<number> {
  const db = await getDB()

  return await db.collection('extractions').countDocuments({
    user_id: new ObjectId(userId),
  })
}

/**
 * Get user's total courses
 */
export async function getUserTotalCourses(userId: string): Promise<number> {
  const db = await getDB()

  const results = (await db
    .collection('extractions')
    .aggregate([
      {
        $match: { user_id: new ObjectId(userId) },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total_courses' },
        },
      },
    ])
    .toArray()) as any[]

  return results[0]?.total || 0
}
