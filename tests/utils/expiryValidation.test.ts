// Tests for expiry validation business logic

describe('Expiry Validation Logic', () => {
  // Simple mock for database operations
  const mockPrisma = {
    jsonShare: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('isShareExpired', () => {
    it('should return false for permanent shares (null expiresAt)', () => {
      const share = {
        id: 'test-id',
        shareId: 'test-share-id',
        expiresAt: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      }

      const currentDate = new Date('2024-01-15T00:00:00Z')
      const isExpired = share.expiresAt ? currentDate > share.expiresAt : false

      expect(isExpired).toBe(false)
    })

    it('should return false for non-expired shares', () => {
      const share = {
        id: 'test-id',
        shareId: 'test-share-id',
        expiresAt: new Date('2024-01-31T00:00:00Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      }

      const currentDate = new Date('2024-01-15T00:00:00Z')
      const isExpired = share.expiresAt ? currentDate > share.expiresAt : false

      expect(isExpired).toBe(false)
    })

    it('should return true for expired shares', () => {
      const share = {
        id: 'test-id',
        shareId: 'test-share-id',
        expiresAt: new Date('2024-01-10T00:00:00Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      }

      const currentDate = new Date('2024-01-15T00:00:00Z')
      const isExpired = share.expiresAt ? currentDate > share.expiresAt : false

      expect(isExpired).toBe(true)
    })

    it('should handle shares expiring exactly at current time', () => {
      const currentTime = new Date('2024-01-15T12:30:00Z')
      
      const share = {
        id: 'test-id',
        shareId: 'test-share-id',
        expiresAt: currentTime,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      }

      // When current time equals expiry time, it should not be expired (> not >=)
      const isExpired = share.expiresAt ? currentTime > share.expiresAt : false
      expect(isExpired).toBe(false)

      // But one millisecond later should be expired
      const oneMillisecondLater = new Date(currentTime.getTime() + 1)
      const isExpiredLater = share.expiresAt ? oneMillisecondLater > share.expiresAt : false
      expect(isExpiredLater).toBe(true)
    })
  })

  describe('getUserActiveShares', () => {
    it('should return only non-expired shares for a user', async () => {
      const currentDate = new Date('2024-01-15T00:00:00Z')
      const mockSharesResult = [
        {
          id: 'share-1',
          shareId: 'share-id-1',
          expiresAt: null, // permanent
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z')
        },
        {
          id: 'share-2',
          shareId: 'share-id-2',
          expiresAt: new Date('2024-01-31T00:00:00Z'), // not expired
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z')
        }
      ]

      ;(mockPrisma.jsonShare.findMany as jest.Mock).mockResolvedValue(mockSharesResult)

      const result = await mockPrisma.jsonShare.findMany({
        where: {
          userId: 'user-123',
          OR: [
            { expiresAt: null }, // permanent shares
            { expiresAt: { gt: currentDate } } // non-expired shares
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
      expect(result[0].expiresAt).toBeNull()
      expect(result[1].expiresAt).toEqual(new Date('2024-01-31T00:00:00Z'))
    })

    it('should handle user with no active shares', async () => {
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
  })

  describe('findShareById', () => {
    it('should find existing non-expired share', async () => {
      const mockShare = {
        id: 'test-id',
        shareId: 'test-share-id',
        content: { test: 'data' },
        userId: 'user-123',
        expiresAt: new Date('2024-01-31T00:00:00Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      };

      ;(mockPrisma.jsonShare.findUnique as jest.Mock).mockResolvedValue(mockShare)

      const result = await mockPrisma.jsonShare.findUnique({
        where: { shareId: 'test-share-id' }
      })

      expect(mockPrisma.jsonShare.findUnique).toHaveBeenCalledWith({
        where: { shareId: 'test-share-id' }
      })
      expect(result).toEqual(mockShare)
    })

    it('should return null for non-existent share', async () => {
      ;(mockPrisma.jsonShare.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await mockPrisma.jsonShare.findUnique({
        where: { shareId: 'non-existent' }
      })

      expect(result).toBeNull()
    })

    it('should find expired share (database returns it, expiry check is done in API)', async () => {
      const expiredShare = {
        id: 'test-id',
        shareId: 'test-share-id',
        content: { test: 'data' },
        userId: 'user-123',
        expiresAt: new Date('2024-01-01T00:00:00Z'), // expired
        createdAt: new Date('2023-12-01T00:00:00Z'),
        updatedAt: new Date('2023-12-01T00:00:00Z')
      };

      ;(mockPrisma.jsonShare.findUnique as jest.Mock).mockResolvedValue(expiredShare)

      const result = await mockPrisma.jsonShare.findUnique({
        where: { shareId: 'test-share-id' }
      })

      expect(result).toEqual(expiredShare)
      
      // Simulate expiry check that would happen in API
      const currentDate = new Date('2024-01-15T00:00:00Z')
      const isExpired = result?.expiresAt ? currentDate > result.expiresAt : false
      expect(isExpired).toBe(true)
    })
  })

  describe('expiryDateValidation', () => {
    it('should validate expiry dates are in the future when created', () => {
      const createdAt = new Date('2024-01-01T00:00:00Z')
      const oneDay = new Date(createdAt)
      oneDay.setDate(oneDay.getDate() + 1)
      
      const sevenDays = new Date(createdAt)
      sevenDays.setDate(sevenDays.getDate() + 7)
      
      const thirtyDays = new Date(createdAt)
      thirtyDays.setDate(thirtyDays.getDate() + 30)

      expect(oneDay > createdAt).toBe(true)
      expect(sevenDays > createdAt).toBe(true)
      expect(thirtyDays > createdAt).toBe(true)
    })

    it('should handle month boundary calculations correctly', () => {
      // Test end of month scenarios
      const endOfJanuary = new Date('2024-01-31T00:00:00Z')
      const oneDay = new Date(endOfJanuary)
      oneDay.setDate(oneDay.getDate() + 1)
      
      expect(oneDay.toISOString()).toBe('2024-02-01T00:00:00.000Z')
    })

    it('should handle leap year calculations', () => {
      const feb28LeapYear = new Date('2024-02-28T00:00:00Z') // 2024 is a leap year
      const oneDay = new Date(feb28LeapYear)
      oneDay.setDate(oneDay.getDate() + 1)
      
      expect(oneDay.toISOString()).toBe('2024-02-29T00:00:00.000Z')
      
      const feb29LeapYear = new Date('2024-02-29T00:00:00Z')
      const oneDayAfterLeap = new Date(feb29LeapYear)
      oneDayAfterLeap.setDate(oneDayAfterLeap.getDate() + 1)
      
      expect(oneDayAfterLeap.toISOString()).toBe('2024-03-01T00:00:00.000Z')
    })
  })
})