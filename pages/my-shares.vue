<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold text-gray-900">我的分享</h1>
          <button
            @click="goToCreateNew"
            class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            新建分享
          </button>
        </div>
        <p class="mt-2 text-sm text-gray-600">管理您创建的所有分享链接</p>
      </div>

      <!-- Loading State -->
      <div v-if="mySharesStore.loading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-gray-600">加载中...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="mySharesStore.error" class="bg-red-50 border border-red-200 rounded-md p-4">
        <div class="flex">
          <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">加载失败</h3>
            <p class="mt-1 text-sm text-red-700">{{ mySharesStore.error }}</p>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="mySharesStore.shares.length === 0" class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">暂无分享</h3>
        <p class="mt-1 text-sm text-gray-500">您还没有创建任何分享链接</p>
        <div class="mt-6">
          <button
            @click="goToCreateNew"
            class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            创建第一个分享
          </button>
        </div>
      </div>

      <!-- Shares List -->
      <div v-else class="bg-white shadow overflow-hidden sm:rounded-md">
        <ul role="list" class="divide-y divide-gray-200">
          <li v-for="share in mySharesStore.shares" :key="share.id" class="px-6 py-4">
            <div class="flex items-center justify-between">
              <div class="flex-1 min-w-0">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div class="ml-4 flex-1 min-w-0">
                    <p class="text-sm font-medium text-blue-600 truncate">
                      <button
                        @click="copyToClipboard(mySharesStore.getShareUrl(share.shareId))"
                        class="hover:text-blue-800"
                      >
                        {{ mySharesStore.getShareUrl(share.shareId) }}
                      </button>
                    </p>
                    <p class="text-xs text-gray-500 mt-1">
                      创建于 {{ mySharesStore.formatDate(share.createdAt) }}
                    </p>
                  </div>
                </div>
              </div>
              <div class="flex items-center space-x-4">
                <div class="text-right">
                  <p class="text-sm text-gray-900">
                    {{ mySharesStore.getExpiryStatus(share.expiresAt) }}
                  </p>
                  <p v-if="mySharesStore.isExpired(share.expiresAt)" class="text-xs text-red-600">
                    已失效
                  </p>
                </div>
                <div class="flex space-x-2">
                  <!-- Copy Button -->
                  <button
                    @click="copyToClipboard(mySharesStore.getShareUrl(share.shareId))"
                    class="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    title="复制链接"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <!-- View Button -->
                  <NuxtLink
                    :to="`/share/${share.shareId}`"
                    class="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    title="查看"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </NuxtLink>
                  <!-- Delete Button -->
                  <button
                    @click="deleteShare(share.shareId)"
                    class="inline-flex items-center p-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    title="删除"
                    :disabled="deletingShareId === share.shareId"
                  >
                    <svg v-if="deletingShareId === share.shareId" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Toast Notification -->
    <div
      v-if="showToast"
      class="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-md shadow-lg transition-opacity duration-300"
    >
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMySharesStore } from '~/stores/myShares'
import { useUploadStore } from '~/stores/upload'

// Page meta
definePageMeta({
  title: '我的分享'
})

const mySharesStore = useMySharesStore()
const uploadStore = useUploadStore()
const deletingShareId = ref<string | null>(null)
const showToast = ref(false)
const toastMessage = ref('')

// Load shares on mount
onMounted(() => {
  mySharesStore.fetchShares()
})

// Function to navigate to homepage and reset upload state
const goToCreateNew = () => {
  // Reset upload state before navigation
  uploadStore.reset()
  // Navigate to homepage
  window.location.href = '/'
}

// Copy to clipboard function
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    showToastMessage('链接已复制到剪贴板')
  } catch (err) {
    console.error('Failed to copy:', err)
    showToastMessage('复制失败')
  }
}

// Delete share function
const deleteShare = async (shareId: string) => {
  if (!confirm('确定要删除这个分享链接吗？删除后将无法恢复。')) {
    return
  }

  deletingShareId.value = shareId
  
  try {
    const success = await mySharesStore.deleteShare(shareId)
    if (success) {
      showToastMessage('分享链接已删除')
    } else {
      showToastMessage('删除失败，请重试')
    }
  } finally {
    deletingShareId.value = null
  }
}

// Toast message function
const showToastMessage = (message: string) => {
  toastMessage.value = message
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 3000)
}
</script>