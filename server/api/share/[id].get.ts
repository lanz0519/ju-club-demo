import { PrismaClient } from '@prisma/client'
import { createApiSuccess, createApiError, API_ERROR_CODES } from '~/server/utils/apiResponse'
import { validateShareId } from '~/server/utils/validation'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const shareId = getRouterParam(event, 'id')
    
    if (!shareId) {
      createApiError(400, API_ERROR_CODES.VALIDATION_ERROR, 'Share ID is required')
    }

    // Validate share ID format and security
    validateShareId(shareId)

    let jsonShare
    try {
      jsonShare = await prisma.jsonShare.findUnique({
        where: { shareId },
        select: {
          content: true,
          createdAt: true,
          expiresAt: true,
          userId: true
        }
      })
    } catch (dbError: any) {
      console.error('Database error while fetching share:', dbError)
      createApiError(500, API_ERROR_CODES.SERVER_ERROR, 'Database query failed')
    }

    if (!jsonShare) {
      createApiError(404, API_ERROR_CODES.NOT_FOUND, 'Share not found or has been deleted')
    }

    // Check if expired
    if (jsonShare.expiresAt && new Date() > jsonShare.expiresAt) {
      createApiError(410, API_ERROR_CODES.EXPIRED, 'Share has expired and is no longer available')
    }

    // Validate content exists and is valid
    if (!jsonShare.content) {
      createApiError(500, API_ERROR_CODES.SERVER_ERROR, 'Share content is corrupted')
    }

    return createApiSuccess({
      content: jsonShare.content,
      createdAt: jsonShare.createdAt,
      expiresAt: jsonShare.expiresAt
    }, 'Share retrieved successfully')
    
  } catch (error: any) {
    // Handle specific error types
    if (error.statusCode) {
      throw error
    }
    
    // Log unexpected errors for debugging
    console.error('Unexpected share retrieval error:', error)
    
    // Handle specific database connection errors
    if (error.name === 'PrismaClientKnownRequestError') {
      createApiError(500, API_ERROR_CODES.SERVER_ERROR, 'Database connection failed')
    }
    
    if (error.name === 'TimeoutError') {
      createApiError(408, API_ERROR_CODES.SERVER_ERROR, 'Request timeout')
    }
    
    createApiError(500, API_ERROR_CODES.SERVER_ERROR, 'Failed to retrieve share', process.env.NODE_ENV === 'development' ? error.message : undefined)
  }
})