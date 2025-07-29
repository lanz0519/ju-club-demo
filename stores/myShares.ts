import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface UserShare {
  id: string
  shareId: string
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export const useMySharesStore = defineStore('myShares', () => {
  const shares = ref<UserShare[]>([])
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)

  const fetchShares = async () => {
    loading.value = true
    error.value = null
    
    try {
      const { getUserHeaders } = useUser()
      const headers = getUserHeaders()
      
      const response = await $fetch<{ success: boolean; data: UserShare[] }>('/api/my-shares', {
        headers
      })
      
      if (response.success) {
        shares.value = response.data
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch shares'
      console.error('Failed to fetch shares:', err)
    } finally {
      loading.value = false
    }
  }

  const deleteShare = async (shareId: string) => {
    try {
      const { getUserHeaders } = useUser()
      const headers = getUserHeaders()
      
      const response = await $fetch<{ success: boolean; message: string }>(`/api/my-shares/${shareId}`, {
        method: 'DELETE',
        headers
      })
      
      if (response.success) {
        // Remove the share from local state
        shares.value = shares.value.filter(share => share.shareId !== shareId)
        return true
      }
      return false
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete share'
      console.error('Failed to delete share:', err)
      return false
    }
  }

  const getShareUrl = (shareId: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/share/${shareId}`
    }
    return `/share/${shareId}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN')
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  const getExpiryStatus = (expiresAt: string | null) => {
    if (!expiresAt) return '永久有效'
    const expiry = new Date(expiresAt)
    const now = new Date()
    
    if (expiry < now) return '已过期'
    
    const diffMs = expiry.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return '今天过期'
    if (diffDays <= 7) return `${diffDays}天后过期`
    
    return formatDate(expiresAt)
  }

  return {
    shares,
    loading,
    error,
    fetchShares,
    deleteShare,
    getShareUrl,
    formatDate,
    isExpired,
    getExpiryStatus
  }
})