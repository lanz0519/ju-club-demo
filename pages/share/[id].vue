<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-6xl mx-auto px-4">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold mb-2">共享 JSON 数据</h1>
        <NuxtLink to="/" class="text-blue-600 hover:text-blue-800 text-sm">
          ← 返回首页
        </NuxtLink>
      </div>

      <div class="bg-white rounded-lg shadow-md p-6">
        <div v-if="pending" class="text-center py-8">
          <div class="text-gray-600 mb-4">加载中...</div>
          
          <!-- Loading Progress Bar -->
          <div v-if="loadingProgress > 0" class="max-w-md mx-auto">
            <div class="flex justify-between text-sm text-gray-600 mb-2">
              <span>加载进度</span>
              <span>{{ loadingProgress }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div 
                class="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                :style="{ width: loadingProgress + '%' }"
              ></div>
            </div>
          </div>
        </div>

        <div v-else-if="error" class="text-center py-8">
          <div class="text-red-600 text-lg font-semibold mb-4">
            {{ shareStore.getErrorMessage(error) }}
          </div>
          <div class="space-y-2">
            <button 
              @click="retryFetch" 
              class="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mr-4"
            >
              重试加载
            </button>
            <NuxtLink to="/" class="text-blue-600 hover:text-blue-800">
              返回首页
            </NuxtLink>
          </div>
        </div>

        <div v-else-if="data" class="space-y-6">
          <div class="flex justify-between items-center flex-wrap gap-4">
            <h2 class="text-xl font-semibold">JSON 内容</h2>
            <div class="flex space-x-2 flex-wrap">
              <button
                @click="copyJsonToClipboard"
                class="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                复制 JSON
              </button>
              <button
                @click="downloadJson"
                class="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
              >
                下载文件
              </button>
            </div>
          </div>

          <!-- Use Virtual JSON Viewer for better performance -->
          <VirtualJsonViewer
            :data="data.content"
            @toggle-view="handleViewToggle"
          />

          <div class="text-sm text-gray-600 space-y-1 border-t pt-4">
            <div>创建时间：{{ formatDate(data.createdAt) }}</div>
            <div v-if="data.expiresAt">
              过期时间：{{ formatDate(data.expiresAt) }}
            </div>
            <div v-else>过期时间：永久有效</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const route = useRoute();
const shareId = route.params.id;
const shareStore = useShareStore()

const { shareData, loading, loadingProgress, error, formattedJson } = storeToRefs(shareStore)

// Handle share data fetching with proper error handling
try {
  await shareStore.fetchShareData(shareId)
} catch (error) {
  // Error is already handled in the store
  console.error('Failed to fetch share data:', error)
}

const data = shareData
const pending = loading

const handleViewToggle = (isTreeView) => {
  shareStore.setTreeView(isTreeView)
}

const copyJsonToClipboard = async () => {
  if (!shareData.value?.content) {
    alert("没有可复制的内容")
    return
  }
  
  try {
    const success = await shareStore.copyJsonToClipboard()
    if (success) {
      alert("JSON 内容已复制到剪贴板")
    } else {
      alert("复制失败，请手动选中并复制")
    }
  } catch (error) {
    console.error('Copy error:', error)
    alert("复制失败，请重试")
  }
}

const downloadJson = () => {
  if (!shareData.value?.content) {
    alert("没有可下载的内容")
    return
  }
  
  if (!shareId || typeof shareId !== 'string') {
    alert("无效的分享链接")
    return
  }
  
  try {
    const success = shareStore.downloadJson(shareId)
    if (!success) {
      alert("下载失败，请重试")
    }
  } catch (error) {
    console.error('Download error:', error)
    alert("下载出错，请重试")
  }
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString("zh-CN");
};

const retryFetch = async () => {
  try {
    await shareStore.fetchShareData(shareId)
  } catch (error) {
    console.error('Retry fetch failed:', error)
  }
};
</script>

