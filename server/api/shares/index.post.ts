import { PrismaClient } from '@prisma/client'
import { createApiSuccess, createApiError, API_ERROR_CODES } from '~/server/utils/apiResponse'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const userId = getHeader(event, 'X-User-ID')
    
    if (!userId) {
      createApiError(401, API_ERROR_CODES.UNAUTHORIZED, 'User ID is required')
    }

    const formData = await readMultipartFormData(event)
    
    if (!formData || formData.length === 0) {
      createApiError(400, API_ERROR_CODES.VALIDATION_ERROR, 'No file uploaded')
    }

    const file = formData[0]
    const expiryDays = formData.find(item => item.name === 'expiryDays')?.data?.toString()
    
    if (!file.data) {
      createApiError(400, API_ERROR_CODES.VALIDATION_ERROR, 'File data is missing')
    }

    // Check file size (50MB limit)
    if (file.data.length > 50 * 1024 * 1024) {
      createApiError(413, API_ERROR_CODES.FILE_TOO_LARGE, 'File size exceeds 50MB limit')
    }

    // Parse JSON content
    let jsonContent
    try {
      jsonContent = JSON.parse(file.data.toString())
    } catch (parseError) {
      createApiError(400, API_ERROR_CODES.INVALID_JSON, 'Invalid JSON format')
    }
    
    // Calculate expiry date
    let expiresAt: Date | null = null
    if (expiryDays && expiryDays !== 'permanent') {
      const days = parseInt(expiryDays)
      if (isNaN(days) || days <= 0) {
        createApiError(400, API_ERROR_CODES.VALIDATION_ERROR, 'Invalid expiry days value')
      }
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + days)
    }

    // Save to database
    const jsonShare = await prisma.jsonShare.create({
      data: {
        content: jsonContent,
        userId,
        expiresAt
      }
    })

    setResponseStatus(event, 201)
    return createApiSuccess({
      id: jsonShare.id,
      shareId: jsonShare.shareId,
      expiresAt: jsonShare.expiresAt,
      createdAt: jsonShare.createdAt
    }, 'JSON share created successfully')
    
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    createApiError(500, API_ERROR_CODES.SERVER_ERROR, 'Failed to create share', error.message)
  }
})