/**
 * Debug API - Check Environment Variables
 * Usage: /api/debug?secret=your-secret-key
 * 
 * SECURITY: Only works with secret parameter in production
 */

import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Security: Require secret in production
  if (process.env.NODE_ENV === 'production' && req.query.secret !== process.env.DEBUG_SECRET) {
    return res.status(403).json({ error: 'Forbidden - Invalid or missing secret' })
  }

  try {
    // Check environment variables (without exposing actual values)
    const mongoUri = process.env.MONGODB_URI || ''
    
    const debugInfo: {
      timestamp: string
      environment: string | undefined
      mongodb: {
        hasUri: boolean
        uriLength: number
        uriStartsWith: string
        hasUsername: boolean
        hasCluster: boolean
        connectionTest: string
        connectionError?: string
      }
      user: {
        hasDefaultUserId: boolean
        userIdLength: number
      }
      optional: {
        hasDebugSecret: boolean
      }
    } = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      
      // MongoDB
      mongodb: {
        hasUri: !!mongoUri,
        uriLength: mongoUri.length,
        uriStartsWith: mongoUri.substring(0, 14), // "mongodb+srv://"
        hasUsername: mongoUri.includes('@'),
        hasCluster: mongoUri.includes('.mongodb.net'),
        connectionTest: '',
        connectionError: undefined,
      },
      
      // User
      user: {
        hasDefaultUserId: !!process.env.DEFAULT_USER_ID,
        userIdLength: process.env.DEFAULT_USER_ID?.length || 0,
      },
      
      // Optional
      optional: {
        hasDebugSecret: !!process.env.DEBUG_SECRET,
      }
    }

    // Try to connect to MongoDB
    try {
      const { healthCheck } = await import('@/lib/db')
      const isHealthy = await healthCheck()
      debugInfo.mongodb.connectionTest = isHealthy ? 'SUCCESS' : 'FAILED'
    } catch (error) {
      debugInfo.mongodb.connectionTest = 'ERROR'
      debugInfo.mongodb.connectionError = error instanceof Error ? error.message : 'Unknown error'
    }

    return res.status(200).json(debugInfo)
  } catch (error) {
    return res.status(500).json({
      error: 'Debug check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
