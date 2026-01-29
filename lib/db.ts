/**
 * Database Connection Module
 * Handles MongoDB connection and initialization
 * v2 Feature: Persistent course storage
 */

import { MongoClient, Db, Collection } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const DB_NAME = 'course_harvester_v2'

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

export interface DBCollections {
  users: Collection
  extractions: Collection
  versions: Collection
  api_logs: Collection
}

/**
 * Connect to MongoDB
 */
export async function connectDB(): Promise<Db> {
  if (cachedDb) {
    return cachedDb
  }

  try {
    const client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
    })

    await client.connect()
    console.log('[DB] Connected to MongoDB')

    cachedClient = client
    cachedDb = client.db(DB_NAME)

    // Initialize collections
    await initializeCollections(cachedDb)

    return cachedDb
  } catch (error) {
    console.error('[DB] Connection failed:', error)
    throw error
  }
}

/**
 * Initialize collections with indexes
 */
async function initializeCollections(db: Db) {
  try {
    // Users collection
    const usersExist = await db.listCollections({ name: 'users' }).hasNext()
    if (!usersExist) {
      await db.createCollection('users')
      console.log('[DB] Created users collection')
    }
    await db.collection('users').createIndex({ email: 1 }, { unique: true })
    await db.collection('users').createIndex({ created_at: -1 })

    // Extractions collection
    const extractionsExist = await db.listCollections({ name: 'extractions' }).hasNext()
    if (!extractionsExist) {
      await db.createCollection('extractions')
      console.log('[DB] Created extractions collection')
    }
    await db.collection('extractions').createIndex({ user_id: 1, created_at: -1 })
    await db.collection('extractions').createIndex({ file_id: 1 })

    // Versions collection
    const versionsExist = await db.listCollections({ name: 'versions' }).hasNext()
    if (!versionsExist) {
      await db.createCollection('versions')
      console.log('[DB] Created versions collection')
    }
    await db.collection('versions').createIndex({ extraction_id: 1, version_number: -1 })

    // API logs collection
    const logsExist = await db.listCollections({ name: 'api_logs' }).hasNext()
    if (!logsExist) {
      await db.createCollection('api_logs')
      console.log('[DB] Created api_logs collection')
    }
    await db.collection('api_logs').createIndex({ user_id: 1, timestamp: -1 })
    await db.collection('api_logs').createIndex({ timestamp: -1 }, { expireAfterSeconds: 2592000 }) // 30 days TTL

    console.log('[DB] All collections initialized')
  } catch (error) {
    console.error('[DB] Error initializing collections:', error)
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectDB() {
  if (cachedClient) {
    await cachedClient.close()
    cachedClient = null
    cachedDb = null
    console.log('[DB] Disconnected')
  }
}

/**
 * Get database instance
 */
export async function getDB(): Promise<Db> {
  if (!cachedDb) {
    return await connectDB()
  }
  return cachedDb
}

/**
 * Health check
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const db = await getDB()
    await db.admin().ping()
    return true
  } catch (error) {
    console.error('[DB] Health check failed:', error)
    return false
  }
}
