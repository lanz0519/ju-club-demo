import { createApiError, API_ERROR_CODES } from './apiResponse'

export function validateJsonContent(content: any): void {
  if (content === null || content === undefined) {
    createApiError(400, API_ERROR_CODES.INVALID_JSON, 'JSON content cannot be null or undefined')
  }
  
  // Check for extremely large objects (basic protection)
  try {
    const jsonString = JSON.stringify(content)
    if (jsonString.length > 100 * 1024 * 1024) { // 100MB limit for stringified JSON
      createApiError(413, API_ERROR_CODES.FILE_TOO_LARGE, 'JSON content too large after processing')
    }
  } catch (error) {
    createApiError(400, API_ERROR_CODES.INVALID_JSON, 'Invalid JSON structure')
  }
}

export function validateShareId(shareId: string): void {
  if (!shareId || typeof shareId !== 'string') {
    createApiError(400, API_ERROR_CODES.VALIDATION_ERROR, 'Invalid share ID')
  }
  
  if (shareId.length < 7 || shareId.length > 32) {
    createApiError(400, API_ERROR_CODES.VALIDATION_ERROR, 'Share ID length is invalid')
  }
  
  if (!/^[a-zA-Z0-9]+$/.test(shareId)) {
    createApiError(400, API_ERROR_CODES.VALIDATION_ERROR, 'Share ID contains invalid characters')
  }
}

export function validateExpiryDays(expiryDays: string): number | null {
  if (!expiryDays || expiryDays === 'permanent') {
    return null
  }
  
  const days = parseInt(expiryDays)
  if (isNaN(days) || days <= 0 || days > 365) {
    createApiError(400, API_ERROR_CODES.VALIDATION_ERROR, 'Expiry days must be between 1 and 365')
  }
  
  return days
}

export function validateFileUpload(file: any): void {
  if (!file || !file.data) {
    createApiError(400, API_ERROR_CODES.VALIDATION_ERROR, 'File data is missing')
  }
  
  if (file.filename && !file.filename.toLowerCase().endsWith('.json')) {
    createApiError(400, API_ERROR_CODES.VALIDATION_ERROR, 'Only JSON files are allowed')
  }
  
  if (file.data.length === 0) {
    createApiError(400, API_ERROR_CODES.VALIDATION_ERROR, 'Empty file is not allowed')
  }
  
  if (file.data.length > 50 * 1024 * 1024) {
    createApiError(413, API_ERROR_CODES.FILE_TOO_LARGE, 'File size exceeds 50MB limit')
  }
}