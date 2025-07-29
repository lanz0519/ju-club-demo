import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface ShareData {
  content: any
  createdAt: string
  expiresAt?: string | null
}

export const useShareStore = defineStore('share', () => {
  const isTreeView = ref<boolean>(true)
  const shareData = ref<ShareData | null>(null)
  const loading = ref<boolean>(false)
  const loadingProgress = ref<number>(0)
  const error = ref<any>(null)

  const formattedJson = computed(() => {
    if (!shareData.value?.content) return ""
    return JSON.stringify(shareData.value.content, null, 2)
  })

  const setTreeView = (view: boolean) => {
    isTreeView.value = view
  }

  const toggleView = () => {
    isTreeView.value = !isTreeView.value
  }

  const setShareData = (data: ShareData | null) => {
    shareData.value = data
  }

  const setLoading = (status: boolean) => {
    loading.value = status
  }

  const setLoadingProgress = (progress: number) => {
    loadingProgress.value = progress
  }

  const setError = (err: any) => {
    error.value = err
  }

  const fetchWithProgress = async (url: string): Promise<any> => {
    try {
      const response = await $fetch(url, {
        timeout: 30000, // 30 second timeout
        retry: 1, // Retry once on failure
        retryDelay: 1000 // 1 second delay before retry
      })
      
      // Validate response structure
      if (!response || typeof response !== 'object') {
        throw new Error('服务器响应格式错误')
      }
      
      if (!response.success && response.error) {
        throw new Error(response.error.message || '服务器错误')
      }
      
      return response.success ? response.data : response
    } catch (error: any) {
      console.error('Fetch error:', error)
      
      // Handle specific HTTP status codes
      if (error.statusCode === 404) {
        throw { statusCode: 404, message: '分享不存在或已被删除' }
      } else if (error.statusCode === 410) {
        throw { statusCode: 410, message: '分享已过期' }
      } else if (error.statusCode === 400) {
        throw { statusCode: 400, message: '请求参数错误' }
      } else if (error.statusCode === 500) {
        throw { statusCode: 500, message: '服务器内部错误' }
      } else if (error.name === 'TimeoutError' || error.statusCode === 408) {
        throw { statusCode: 408, message: '请求超时，请稍后重试' }
      } else if (error.name === 'NetworkError' || !navigator.onLine) {
        throw { statusCode: 0, message: '网络连接失败，请检查网络设置' }
      } else {
        throw { statusCode: error.statusCode || 500, message: error.message || '加载失败，请稍后重试' }
      }
    }
  }

  const fetchShareData = async (shareId: string) => {
    // Validate shareId parameter
    if (!shareId || typeof shareId !== 'string') {
      const error = { statusCode: 400, message: '无效的分享链接' }
      setError(error)
      throw error
    }
    
    // Basic shareId format validation
    if (shareId.length < 7 || shareId.length > 32 || !/^[a-zA-Z0-9]+$/.test(shareId)) {
      const error = { statusCode: 400, message: '分享链接格式错误' }
      setError(error)
      throw error
    }

    setLoading(true)
    setLoadingProgress(0)
    setError(null)
    
    try {
      setLoadingProgress(20)
      
      // Use fetch with progress tracking for large files
      const response = await fetchWithProgress(`/api/share/${encodeURIComponent(shareId)}`)
      
      setLoadingProgress(70)
      
      // Validate response data structure
      if (!response || typeof response !== 'object') {
        throw { statusCode: 500, message: '服务器返回数据格式错误' }
      }
      
      if (!response.content) {
        throw { statusCode: 500, message: '分享内容丢失或损坏' }
      }
      
      setLoadingProgress(90)
      setShareData(response)
      setLoadingProgress(100)
      
      return response
    } catch (err: any) {
      console.error('Share fetch error:', err)
      setError(err)
      throw err
    } finally {
      setLoading(false)
      setTimeout(() => setLoadingProgress(0), 1000)
    }
  }

  const copyJsonToClipboard = async () => {
    try {
      if (!formattedJson.value) {
        console.error('No JSON content to copy')
        return false
      }
      
      if (process.client && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(formattedJson.value)
        return true
      } else if (process.client) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = formattedJson.value
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        try {
          const successful = document.execCommand('copy')
          document.body.removeChild(textArea)
          return successful
        } catch (err) {
          console.error('Fallback copy failed:', err)
          document.body.removeChild(textArea)
          return false
        }
      }
      
      return false
    } catch (error) {
      console.error('Copy failed:', error)
      return false
    }
  }

  const downloadJson = (shareId: string) => {
    if (!shareData.value?.content || !process.client) {
      console.error('No data to download or not in client environment')
      return false
    }
    
    if (!shareId || typeof shareId !== 'string') {
      console.error('Invalid shareId for download')
      return false
    }

    try {
      const jsonContent = formattedJson.value
      if (!jsonContent) {
        console.error('No formatted JSON content available')
        return false
      }
      
      const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `shared-data-${shareId}.json`
      a.style.display = 'none'
      
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      // Clean up the object URL after a short delay
      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 100)
      
      return true
    } catch (error) {
      console.error('Download failed:', error)
      return false
    }
  }

  const getErrorMessage = (err: any) => {
    if (!err) {
      return '❌ 未知错误'
    }
    
    // Use custom message if available
    if (err.message) {
      return `❌ ${err.message}`
    }
    
    // Handle specific status codes
    switch (err.statusCode) {
      case 400:
        return '❌ 请求参数错误'
      case 404:
        return '❌ 分享不存在或已被删除'
      case 408:
        return '⏰ 请求超时，请稍后重试'
      case 410:
        return '⏰ 分享已过期且不可用'
      case 500:
        return '❌ 服务器错误，请稍后重试'
      case 0:
        return '❌ 网络连接失败'
      default:
        return '❌ 加载失败，请稍后重试'
    }
  }

  return {
    isTreeView,
    shareData,
    loading,
    loadingProgress,
    error,
    formattedJson,
    setTreeView,
    toggleView,
    setShareData,
    setLoading,
    setLoadingProgress,
    setError,
    fetchShareData,
    copyJsonToClipboard,
    downloadJson,
    getErrorMessage
  }
})