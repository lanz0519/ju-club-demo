// Mock Prisma Client with proper Jest mock types
const mockPrismaClient = {
  jsonShare: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
  $disconnect: jest.fn(),
}

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaClient),
}))

// Mock Nuxt functions
;(global as any).defineEventHandler = jest.fn().mockImplementation((handler) => handler)
;(global as any).getHeader = jest.fn()
;(global as any).getRouterParam = jest.fn()
;(global as any).readMultipartFormData = jest.fn()
;(global as any).setResponseStatus = jest.fn()
;(global as any).createError = jest.fn().mockImplementation(({ statusCode, data }) => {
  const error = new Error(data?.error?.message || 'Error')
  ;(error as any).statusCode = statusCode
  ;(error as any).data = data
  return error
})

// Set up timezone for consistent date testing
process.env.TZ = 'UTC'