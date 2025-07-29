import { PrismaClient } from '@prisma/client'
import { createApiSuccess, createApiError, API_ERROR_CODES } from '~/server/utils/apiResponse'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const shareId = getRouterParam(event, 'id')
    
    if (!shareId) {
      createApiError(400, API_ERROR_CODES.VALIDATION_ERROR, 'Share ID is required')
    }

    const jsonShare = await prisma.jsonShare.findUnique({
      where: { shareId }
    })

    if (!jsonShare) {
      createApiError(404, API_ERROR_CODES.NOT_FOUND, 'Share not found')
    }

    // Check if expired
    if (jsonShare.expiresAt && new Date() > jsonShare.expiresAt) {
      createApiError(410, API_ERROR_CODES.EXPIRED, 'Share has expired')
    }

    return createApiSuccess({
      content: jsonShare.content,
      createdAt: jsonShare.createdAt,
      expiresAt: jsonShare.expiresAt
    }, 'Share retrieved successfully')
    
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    createApiError(500, API_ERROR_CODES.SERVER_ERROR, 'Failed to retrieve share', error.message)
  }
})