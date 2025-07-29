<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-2xl mx-auto px-4">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">JSON 文件分享</h1>
        <NuxtLink
          to="/my-shares"
          class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg
            class="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          我的分享
        </NuxtLink>
      </div>

      <div class="bg-white rounded-lg shadow-md p-6">
        <div v-if="!shareResult" class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              选择 JSON 文件
            </label>
            <input
              ref="fileInput"
              type="file"
              accept=".json"
              @change="handleFileSelect"
              class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <div v-if="selectedFile" class="mt-2 text-sm text-gray-600">
              文件大小: {{ formatFileSize(selectedFile.size) }}
              <span
                v-if="selectedFile.size > 5 * 1024 * 1024"
                class="text-yellow-600 font-medium"
              >
                (大文件可能影响预览性能)
              </span>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              链接有效期
            </label>
            <select
              :value="expiryDays"
              @change="uploadStore.setExpiryDays($event.target.value)"
              class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1">1 天</option>
              <option value="7">7 天</option>
              <option value="30">30 天</option>
              <option value="permanent">永久有效</option>
            </select>
          </div>

          <button
            @click="handleUpload"
            :disabled="!selectedFile || uploading"
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {{ uploading ? "上传中..." : "生成分享链接" }}
          </button>

          <!-- Progress Bar -->
          <div v-if="uploading" class="mt-4">
            <div class="flex justify-between text-sm text-gray-600 mb-1">
              <span>上传进度</span>
              <span>{{ uploadProgress }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div
                class="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                :style="{ width: uploadProgress + '%' }"
              ></div>
            </div>
          </div>
        </div>

        <div v-else class="text-center space-y-4">
          <div class="text-green-600 text-lg font-semibold">✅ 上传成功！</div>

          <div class="bg-gray-100 p-4 rounded-lg">
            <p class="text-sm text-gray-600 mb-2">分享链接：</p>
            <div class="flex items-center space-x-2">
              <input
                :value="shareUrl"
                readonly
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
              />
              <button
                @click="copyToClipboard"
                class="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                复制
              </button>
            </div>
          </div>

          <div v-if="shareResult.expiresAt" class="text-sm text-gray-600">
            链接将于 {{ formatDate(shareResult.expiresAt) }} 过期
          </div>

          <button
            @click="reset"
            class="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            上传新文件
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const uploadStore = useUploadStore();
const fileInput = ref(null);

const {
  selectedFile,
  expiryDays,
  uploading,
  uploadProgress,
  shareResult,
  shareUrl,
} = storeToRefs(uploadStore);

// Reset state when navigating back to homepage (for browser back button)
onActivated(() => {
  // Reset if not uploading and coming from my-shares page
  if (
    !uploading.value &&
    process.client &&
    document.referrer.includes("/my-shares")
  ) {
    uploadStore.reset();
    if (fileInput.value) {
      fileInput.value.value = "";
    }
  }
});

const handleFileSelect = (event) => {
  const file = event.target.files[0];
  
  // Reset any previous file selection
  uploadStore.setSelectedFile(null);
  
  if (!file) {
    return;
  }
  
  // Validate file type by extension
  if (!file.name.toLowerCase().endsWith('.json')) {
    alert("请选择有效的 JSON 文件（.json 扩展名）");
    event.target.value = "";
    return;
  }
  
  // Additional MIME type check
  if (file.type && file.type !== "application/json" && !file.type.includes('json')) {
    alert("文件MIME类型不正确，请选择有效的 JSON 文件");
    event.target.value = "";
    return;
  }
  
  // Check file size
  if (file.size === 0) {
    alert("不能选择空文件");
    event.target.value = "";
    return;
  }
  
  if (file.size > 50 * 1024 * 1024) {
    alert(`文件过大（${(file.size / (1024 * 1024)).toFixed(2)}MB），最大支持50MB`);
    event.target.value = "";
    return;
  }
  
  uploadStore.setSelectedFile(file);
};

const handleUpload = async () => {
  if (!selectedFile.value) {
    alert("请先选择要上传的文件");
    return;
  }
  
  try {
    await uploadStore.uploadFile();
  } catch (error) {
    console.error('Upload error:', error);
    
    // Display user-friendly error message
    const errorMessage = error?.message || "上传失败，请稍后重试";
    alert(errorMessage);
    
    // Reset file input if there was an error
    if (fileInput.value) {
      fileInput.value.value = "";
    }
    uploadStore.setSelectedFile(null);
  }
};

const copyToClipboard = async () => {
  if (!shareUrl.value) {
    alert("没有可复制的链接");
    return;
  }
  
  try {
    if (typeof window !== 'undefined' && window.navigator?.clipboard) {
      await window.navigator.clipboard.writeText(shareUrl.value);
      alert("链接已复制到剪贴板");
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl.value;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          alert("链接已复制到剪贴板");
        } else {
          alert("复制失败，请手动复制链接");
        }
      } catch (err) {
        document.body.removeChild(textArea);
        alert("复制失败，请手动复制链接");
      }
    }
  } catch (error) {
    console.error("Copy failed:", error);
    alert("复制失败，请手动复制链接");
  }
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString("zh-CN");
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const reset = () => {
  uploadStore.reset();
  if (fileInput.value) {
    fileInput.value.value = "";
  }
};
</script>

<style>
body {
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    sans-serif;
}
</style>