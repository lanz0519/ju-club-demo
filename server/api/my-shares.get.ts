import { PrismaClient } from '@prisma/client'
import { createApiSuccess, createApiError, API_ERROR_CODES } from '~/server/utils/apiResponse'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const userId = getHeader(event, 'X-User-ID')
    
    if (!userId) {
      createApiError(401, API_ERROR_CODES.UNAUTHORIZED, 'User ID is required')
    }

    // Get all shares for the user that haven't expired
    const shares = await prisma.jsonShare.findMany({
      where: {
        userId,
        OR: [
          { expiresAt: null }, // permanent shares
          { expiresAt: { gt: new Date() } } // non-expired shares
        ]
      },
      select: {
        id: true,
        shareId: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return createApiSuccess(shares, 'Shares retrieved successfully')
    
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    createApiError(500, API_ERROR_CODES.SERVER_ERROR, 'Failed to retrieve shares', error.message)
  }
})