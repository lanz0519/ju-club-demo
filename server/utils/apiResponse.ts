export interface ApiSuccessResponse<T = any> {
  success: true
  data: T
  message?: string
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

export function createApiSuccess<T>(data: T, message?: string): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    message
  }
}

export function createApiError(
  statusCode: number,
  code: string,
  message: string,
  details?: any
): never {
  const errorResponse: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details
    }
  }
  
  throw createError({
    statusCode,
    data: errorResponse
  })
}

// Common error codes
export const API_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  EXPIRED: 'EXPIRED',
  SERVER_ERROR: 'SERVER_ERROR',
  INVALID_JSON: 'INVALID_JSON',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE'
} as const