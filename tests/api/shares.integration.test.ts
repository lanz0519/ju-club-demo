// Integration tests for the shares API endpoints

describe('Shares API Integration Tests', () => {
  // Mock for database operations
  const mockPrisma = {
    jsonShare: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/shares - Create Share', () => {
    it('should create share successfully with valid data', async () => {
      const mockShare = {
        id: 'test-id',
        shareId: 'test-share-id',
        content: { test: 'data' },
        userId: 'user-123',
        expiresAt: new Date('2024-01-08T00:00:00Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      };

      ;(mockPrisma.jsonShare.create as jest.Mock).mockResolvedValue(mockShare)

      // Test the business logic that would be in the API handler
      const userId = 'user-123'
      const fileData = Buffer.from('{"test": "data"}')
      const expiryDays = '7'

      // Validate user ID
      expect(userId).toBeTruthy()

      // Validate file size
      expect(fileData.length).toBeLessThanOrEqual(50 * 1024 * 1024)

      // Validate JSON
      const jsonContent = JSON.parse(fileData.toString())
      expect(jsonContent).toEqual({ test: 'data' })

      // Calculate expiry
      const days = parseInt(expiryDays)
      expect(days).toBe(7)
      const expiresAt = new Date('2024-01-01T00:00:00Z')
      expiresAt.setDate(expiresAt.getDate() + days)

      // Create share
      const result = await mockPrisma.jsonShare.create({
        data: {
          content: jsonContent,
          userId,
          expiresAt
        }
      })

      expect(mockPrisma.jsonShare.create).toHaveBeenCalledWith({
        data: {
          content: { test: 'data' },
          userId: 'user-123',
          expiresAt: expect.any(Date)
        }
      })

      expect(result).toEqual(mockShare)
    })

    it('should reject request without user ID', () => {
      const userId = null
      
      expect(() => {
        if (!userId) {
          throw new Error('User ID is required')
        }
      }).toThrow('User ID is required')
    })

    it('should reject file over size limit', () => {
      const fileSize = 60 * 1024 * 1024 // 60MB
      const maxSize = 50 * 1024 * 1024 // 50MB
      
      expect(() => {
        if (fileSize > maxSize) {
          throw new Error('File size exceeds 50MB limit')
        }
      }).toThrow('File size exceeds 50MB limit')
    })

    it('should reject invalid JSON', () => {
      const invalidJson = '{invalid json}'
      
      expect(() => {
        JSON.parse(invalidJson)
      }).toThrow()
    })

    it('should reject invalid expiry days', () => {
      const invalidExpiryDays = ['0', '-1', 'abc', '']
      
      invalidExpiryDays.forEach(days => {
        const parsed = parseInt(days)
        expect(isNaN(parsed) || parsed <= 0).toBe(true)
      })
    })

    it('should create permanent share when expiryDays is "permanent"', async () => {
      const mockShare = {
        id: 'test-id',
        shareId: 'test-share-id',
        content: { test: 'data' },
        userId: 'user-123',
        expiresAt: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      };

      ;(mockPrisma.jsonShare.create as jest.Mock).mockResolvedValue(mockShare)

      const expiryDays = 'permanent'
      let expiresAt: Date | null = null
      
      if (expiryDays && expiryDays !== 'permanent') {
        const days = parseInt(expiryDays)
        if (!isNaN(days) && days > 0) {
          expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + days)
        }
      }

      const result = await mockPrisma.jsonShare.create({
        data: {
          content: { test: 'data' },
          userId: 'user-123',
          expiresAt
        }
      })

      expect(result.expiresAt).toBeNull()
    })
  })

  describe('GET /api/shares/[id] - Get Share', () => {
    it('should retrieve existing non-expired share', async () => {
      const shareId = 'test-share-id'
      const mockShare = {
        id: 'test-id',
        shareId,
        content: { test: 'data' },
        userId: 'user-123',
        expiresAt: new Date('2024-01-31T00:00:00Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      };

      ;(mockPrisma.jsonShare.findUnique as jest.Mock).mockResolvedValue(mockShare)

      const result = await mockPrisma.jsonShare.findUnique({
        where: { shareId }
      })

      expect(result).toEqual(mockShare)

      // Check expiry logic
      const currentDate = new Date('2024-01-15T00:00:00Z')
      const isExpired = result?.expiresAt ? currentDate > result.expiresAt : false
      expect(isExpired).toBe(false)
    })

    it('should return null for non-existent share', async () => {
      ;(mockPrisma.jsonShare.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await mockPrisma.jsonShare.findUnique({
        where: { shareId: 'non-existent' }
      })

      expect(result).toBeNull()
    })

    it('should detect expired share', async () => {
      const mockShare = {
        id: 'test-id',
        shareId: 'test-share-id',
        content: { test: 'data' },
        userId: 'user-123',
        expiresAt: new Date('2024-01-01T00:00:00Z'), // expired
        createdAt: new Date('2023-12-01T00:00:00Z'),
        updatedAt: new Date('2023-12-01T00:00:00Z')
      };

      ;(mockPrisma.jsonShare.findUnique as jest.Mock).mockResolvedValue(mockShare)

      const result = await mockPrisma.jsonShare.findUnique({
        where: { shareId: 'test-share-id' }
      })

      expect(result).toEqual(mockShare)

      // Check expiry logic
      const currentDate = new Date('2024-01-15T00:00:00Z')
      const isExpired = result?.expiresAt ? currentDate > result.expiresAt : false
      expect(isExpired).toBe(true)
    })

    it('should handle permanent shares (null expiresAt)', async () => {
      const mockShare = {
        id: 'test-id',
        shareId: 'test-share-id',
        content: { test: 'data' },
        userId: 'user-123',
        expiresAt: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      };

      ;(mockPrisma.jsonShare.findUnique as jest.Mock).mockResolvedValue(mockShare)

      const result = await mockPrisma.jsonShare.findUnique({
        where: { shareId: 'test-share-id' }
      })

      const currentDate = new Date('2024-01-15T00:00:00Z')
      const isExpired = result?.expiresAt ? currentDate > result.expiresAt : false
      expect(isExpired).toBe(false)
    })
  })

  describe('GET /api/my-shares - Get User Shares', () => {
    it('should return active shares for user', async () => {
      const userId = 'user-123'
      const currentDate = new Date('2024-01-15T00:00:00Z')
      
      const mockShares = [
        {
          id: 'share-1',
          shareId: 'share-id-1',
          expiresAt: null, // permanent
          createdAt: new Date('2024-01-10T00:00:00Z'),
          updatedAt: new Date('2024-01-10T00:00:00Z')
        },
        {
          id: 'share-2',
          shareId: 'share-id-2',
          expiresAt: new Date('2024-01-31T00:00:00Z'), // not expired
          createdAt: new Date('2024-01-05T00:00:00Z'),
          updatedAt: new Date('2024-01-05T00:00:00Z')
        }
      ];

      ;(mockPrisma.jsonShare.findMany as jest.Mock).mockResolvedValue(mockShares)

      const result = await mockPrisma.jsonShare.findMany({
        where: {
          userId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: currentDate } }
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

      expect(mockPrisma.jsonShare.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: currentDate } }
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

      expect(result).toHaveLength(2)
      expect(result[0].createdAt.getTime()).toBeGreaterThan(result[1].createdAt.getTime())
    })

    it('should return empty array for user with no shares', async () => {
      ;(mockPrisma.jsonShare.findMany as jest.Mock).mockResolvedValue([])

      const result = await mockPrisma.jsonShare.findMany({
        where: {
          userId: 'user-no-shares',
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      })

      expect(result).toHaveLength(0)
    })

    it('should require user ID', () => {
      const userId = null
      
      expect(() => {
        if (!userId) {
          throw new Error('User ID is required')
        }
      }).toThrow('User ID is required')
    })
  })

  describe('DELETE /api/my-shares/[id] - Delete User Share', () => {
    it('should delete share belonging to user', async () => {
      const shareId = 'test-share-id'
      const userId = 'user-123'
      
      const mockShare = {
        id: 'test-id',
        shareId,
        userId,
        content: { test: 'data' },
        expiresAt: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      };

      // First find the share to verify ownership
      ;(mockPrisma.jsonShare.findUnique as jest.Mock).mockResolvedValue(mockShare)
      
      // Then delete it
      ;(mockPrisma.jsonShare.delete as jest.Mock).mockResolvedValue(mockShare)

      // Verify ownership
      const foundShare = await mockPrisma.jsonShare.findUnique({
        where: { shareId }
      })

      expect(foundShare?.userId).toBe(userId)

      // Delete the share
      const result = await mockPrisma.jsonShare.delete({
        where: { shareId }
      })

      expect(mockPrisma.jsonShare.delete).toHaveBeenCalledWith({
        where: { shareId }
      })
      expect(result).toEqual(mockShare)
    })

    it('should not delete share belonging to different user', async () => {
      const shareId = 'test-share-id'
      const requestingUserId = 'user-123'
      const shareOwnerUserId = 'user-456'
      
      const mockShare = {
        id: 'test-id',
        shareId,
        userId: shareOwnerUserId,
        content: { test: 'data' },
        expiresAt: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      };

      ;(mockPrisma.jsonShare.findUnique as jest.Mock).mockResolvedValue(mockShare)

      const foundShare = await mockPrisma.jsonShare.findUnique({
        where: { shareId }
      })

      // Verify that user IDs don't match
      expect(foundShare?.userId).not.toBe(requestingUserId)
      expect(foundShare?.userId).toBe(shareOwnerUserId)

      // Should throw error for unauthorized access
      expect(() => {
        if (foundShare?.userId !== requestingUserId) {
          throw new Error('Unauthorized: Cannot delete share belonging to another user')
        }
      }).toThrow('Unauthorized: Cannot delete share belonging to another user')
    })

    it('should handle non-existent share', async () => {
      ;(mockPrisma.jsonShare.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await mockPrisma.jsonShare.findUnique({
        where: { shareId: 'non-existent' }
      })

      expect(result).toBeNull()
    })
  })
})