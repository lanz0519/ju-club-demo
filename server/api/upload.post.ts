import { PrismaClient } from '@prisma/client'
import { createApiSuccess, createApiError, API_ERROR_CODES } from '~/server/utils/apiResponse'
import { validateJsonContent, validateExpiryDays, validateFileUpload } from '~/server/utils/validation'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const userId = getHeader(event, 'X-User-ID')
    
    if (!userId) {
      createApiError(401, API_ERROR_CODES.UNAUTHORIZED, 'User ID is required')
    }

    let formData
    try {
      formData = await readMultipartFormData(event)
    } catch (parseError) {
      createApiError(400, API_ERROR_CODES.VALIDATION_ERROR, 'Invalid multipart form data')
    }
    
    if (!formData || formData.length === 0) {
      createApiError(400, API_ERROR_CODES.VALIDATION_ERROR, 'No file uploaded')
    }

    const file = formData[0]
    const expiryDays = formData.find(item => item.name === 'expiryDays')?.data?.toString()
    
    // Validate file upload
    validateFileUpload(file)

    // Parse JSON content with detailed error handling
    let jsonContent
    try {
      const fileContent = file.data.toString('utf8')
      if (!fileContent.trim()) {
        createApiError(400, API_ERROR_CODES.INVALID_JSON, 'File contains no valid content')
      }
      jsonContent = JSON.parse(fileContent)
    } catch (parseError: any) {
      const errorMessage = parseError.message || 'Invalid JSON format'
      createApiError(400, API_ERROR_CODES.INVALID_JSON, `JSON parsing failed: ${errorMessage}`)
    }
    
    // Validate JSON content
    validateJsonContent(jsonContent)

    // Calculate expiry date with validation
    let expiresAt: Date | null = null
    const validatedDays = validateExpiryDays(expiryDays || 'permanent')
    if (validatedDays) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + validatedDays)
    }

    // Save to database with error handling
    let jsonShare
    try {
      jsonShare = await prisma.jsonShare.create({
        data: {
          content: jsonContent,
          userId,
          expiresAt
        }
      })
    } catch (dbError: any) {
      console.error('Database error:', dbError)
      if (dbError.code === 'P2002') {
        createApiError(409, API_ERROR_CODES.SERVER_ERROR, 'Duplicate share ID generated, please try again')
      }
      createApiError(500, API_ERROR_CODES.SERVER_ERROR, 'Database operation failed')
    }

    return createApiSuccess({
      shareId: jsonShare.shareId,
      expiresAt: jsonShare.expiresAt
    }, 'JSON file uploaded successfully')
    
  } catch (error: any) {
    // Handle specific error types
    if (error.statusCode) {
      throw error
    }
    
    // Log unexpected errors for debugging
    console.error('Unexpected upload error:', error)
    
    // Handle specific error types
    if (error.name === 'PayloadTooLargeError') {
      createApiError(413, API_ERROR_CODES.FILE_TOO_LARGE, 'Request payload too large')
    }
    
    if (error.name === 'TimeoutError') {
      createApiError(408, API_ERROR_CODES.SERVER_ERROR, 'Request timeout')
    }
    
    createApiError(500, API_ERROR_CODES.SERVER_ERROR, 'Failed to upload file', process.env.NODE_ENV === 'development' ? error.message : undefined)
  }
})