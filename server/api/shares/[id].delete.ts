import { PrismaClient } from '@prisma/client'
import { createApiSuccess, createApiError, API_ERROR_CODES } from '~/server/utils/apiResponse'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const userId = getHeader(event, 'X-User-ID')
    const shareId = getRouterParam(event, 'id')
    
    if (!userId) {
      createApiError(401, API_ERROR_CODES.UNAUTHORIZED, 'User ID is required')
    }

    if (!shareId) {
      createApiError(400, API_ERROR_CODES.VALIDATION_ERROR, 'Share ID is required')
    }

    // First check if the share exists and belongs to the user
    const existingShare = await prisma.jsonShare.findFirst({
      where: {
        shareId,
        userId
      }
    })

    if (!existingShare) {
      createApiError(404, API_ERROR_CODES.NOT_FOUND, 'Share not found or access denied')
    }

    // Delete the share
    await prisma.jsonShare.delete({
      where: {
        id: existingShare.id
      }
    })

    return createApiSuccess(null, 'Share deleted successfully')
    
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    createApiError(500, API_ERROR_CODES.SERVER_ERROR, 'Failed to delete share', error.message)
  }
})