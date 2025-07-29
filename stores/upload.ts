import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
declare const window: Window & typeof globalThis

interface ShareResult {
  shareId: string
  expiresAt?: string | null
}

export const useUploadStore = defineStore('upload', () => {
  const selectedFile = ref<File | null>(null)
  const expiryDays = ref<string>('1')
  const uploading = ref<boolean>(false)
  const uploadProgress = ref<number>(0)
  const shareResult = ref<ShareResult | null>(null)

  const shareUrl = computed(() => {
    if (!shareResult.value) return ''
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/share/${shareResult.value.shareId}`
    }
    return `/share/${shareResult.value.shareId}`
  })

  const setSelectedFile = (file: File | null) => {
    selectedFile.value = file
  }

  const setExpiryDays = (days: string) => {
    expiryDays.value = days
  }

  const setUploading = (status: boolean) => {
    uploading.value = status
  }

  const setUploadProgress = (progress: number) => {
    uploadProgress.value = progress
  }

  const setShareResult = (result: ShareResult | null) => {
    shareResult.value = result
  }

  const uploadFile = async () => {
    if (!selectedFile.value) {
      throw new Error('请选择要上传的文件')
    }

    // File type validation
    if (!selectedFile.value.name.toLowerCase().endsWith('.json')) {
      throw new Error('只支持JSON文件格式')
    }

    // File size validation
    const fileSizeMB = selectedFile.value.size / (1024 * 1024)
    const maxSizeMB = 50
    
    if (fileSizeMB > maxSizeMB) {
      throw new Error(`文件大小 ${fileSizeMB.toFixed(2)}MB 超过限制 ${maxSizeMB}MB`)
    }

    // Check for empty file
    if (selectedFile.value.size === 0) {
      throw new Error('不能上传空文件')
    }

    // Validate expiry days
    if (expiryDays.value && expiryDays.value !== 'permanent') {
      const days = parseInt(expiryDays.value)
      if (isNaN(days) || days <= 0 || days > 365) {
        throw new Error('有效期设置错误')
      }
    }

    setUploading(true)
    setUploadProgress(0)
    
    try {
      // For large files (>5MB), validate JSON before upload
      if (fileSizeMB > 5) {
        setUploadProgress(10)
        try {
          await validateJsonFile(selectedFile.value)
        } catch (validationError: any) {
          throw new Error(`文件验证失败: ${validationError.message}`)
        }
        setUploadProgress(20)
      }
      
      const formData = new FormData()
      formData.append('file', selectedFile.value)
      formData.append('expiryDays', expiryDays.value)

      setUploadProgress(30)

      // Use XMLHttpRequest for progress tracking
      const response = await uploadWithProgress(formData)
      
      setUploadProgress(100)
      setShareResult({
        shareId: response.shareId,
        expiresAt: response.expiresAt
      })
      return response
    } catch (error: any) {
      console.error('Upload failed:', error)
      
      // Re-throw with user-friendly message
      if (error.message) {
        throw error
      } else {
        throw new Error('上传失败，请稍后重试')
      }
    } finally {
      setUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  const validateJsonFile = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('文件不存在'))
        return
      }

      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          if (!content || !content.trim()) {
            reject(new Error('文件内容为空'))
            return
          }
          
          const parsed = JSON.parse(content)
          
          // Additional validation
          if (parsed === null || parsed === undefined) {
            reject(new Error('JSON内容不能为空'))
            return
          }
          
          resolve()
        } catch (error: any) {
          if (error.name === 'SyntaxError') {
            reject(new Error(`JSON格式错误: ${error.message}`))
          } else {
            reject(new Error('JSON解析失败'))
          }
        }
      }
      
      reader.onerror = (error) => {
        console.error('FileReader error:', error)
        reject(new Error('文件读取失败，请检查文件是否损坏'))
      }
      
      reader.onabort = () => {
        reject(new Error('文件读取被中断'))
      }
      
      try {
        reader.readAsText(file, 'utf-8')
      } catch (error) {
        reject(new Error('无法读取文件'))
      }
    })
  }

  const uploadWithProgress = async (formData: FormData): Promise<any> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const { getUserHeaders } = useUser()
      
      // Set timeout (30 seconds for large files)
      xhr.timeout = 30000
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 70) + 30 // 30-100%
          setUploadProgress(progress)
        }
      })
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText)
            if (response.success) {
              resolve(response.data)
            } else {
              reject(new Error(response.error?.message || '上传失败'))
            }
          } catch (error) {
            reject(new Error('服务器响应格式错误'))
          }
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText)
            const errorMessage = errorResponse.error?.message || `HTTP ${xhr.status} 错误`
            reject(new Error(errorMessage))
          } catch (parseError) {
            // Handle specific HTTP status codes
            switch (xhr.status) {
              case 400:
                reject(new Error('请求参数错误，请检查文件格式'))
                break
              case 401:
                reject(new Error('身份验证失败，请刷新页面重试'))
                break
              case 413:
                reject(new Error('文件过大，请选择小于50MB的文件'))
                break
              case 422:
                reject(new Error('文件格式不正确，请选择有效的JSON文件'))
                break
              case 500:
                reject(new Error('服务器内部错误，请稍后重试'))
                break
              default:
                reject(new Error(`上传失败 (${xhr.status})，请稍后重试`))
            }
          }
        }
      })
      
      xhr.addEventListener('error', () => {
        reject(new Error('网络连接错误，请检查网络设置'))
      })
      
      xhr.addEventListener('timeout', () => {
        reject(new Error('上传超时，文件可能过大或网络不稳定'))
      })
      
      xhr.addEventListener('abort', () => {
        reject(new Error('上传已取消'))
      })
      
      try {
        xhr.open('POST', '/api/upload')
        
        // Set user ID header
        const headers = getUserHeaders()
        Object.entries(headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value as string)
        })
        
        xhr.send(formData)
      } catch (error) {
        reject(new Error('无法发起上传请求'))
      }
    })
  }

  const reset = () => {
    selectedFile.value = null
    shareResult.value = null
    expiryDays.value = '1'
    uploadProgress.value = 0
  }

  return {
    selectedFile,
    expiryDays,
    uploading,
    uploadProgress,
    shareResult,
    shareUrl,
    setSelectedFile,
    setExpiryDays,
    setUploading,
    setUploadProgress,
    setShareResult,
    uploadFile,
    reset
  }
})