<template>
  <div class="virtual-json-viewer" ref="containerRef">
    <div class="json-controls mb-4 flex justify-between items-center">
      <div class="flex space-x-2">
        <button
          @click="toggleView"
          class="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
        >
          {{ isTreeView ? "源码视图" : "树状视图" }}
        </button>
        <button
          @click="expandAll"
          v-if="isTreeView"
          class="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
        >
          全部展开
        </button>
        <button
          @click="collapseAll"
          v-if="isTreeView"
          class="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
        >
          全部折叠
        </button>
      </div>
      <div class="text-sm text-gray-600">
        {{ totalLines }} 行 | 大小: {{ formatFileSize(jsonString.length) }}
      </div>
    </div>

    <div class="json-content border rounded-lg overflow-hidden bg-white">
      <!-- Tree View with Virtual Scrolling -->
      <div v-if="isTreeView" class="tree-view">
        <div
          ref="treeContainerRef"
          class="tree-container"
          :style="{ height: containerHeight + 'px' }"
          @scroll="handleTreeScroll"
        >
          <div
            :style="{ height: totalTreeHeight + 'px', position: 'relative' }"
          >
            <div
              :style="{
                transform: `translateY(${startOffset}px)`,
                position: 'absolute',
                width: '100%',
              }"
            >
              <div
                v-for="item in visibleTreeItems"
                :key="`tree-${item.id}`"
                :style="{ height: itemHeight + 'px' }"
                class="tree-item flex items-center px-4 py-1 hover:bg-gray-50"
              >
                <div
                  :style="{ paddingLeft: item.level * 20 + 'px' }"
                  class="flex items-center w-full"
                >
                  <span
                    v-if="item.hasChildren"
                    class="toggle-icon w-4 h-4 mr-2 cursor-pointer"
                    @click.stop.prevent="toggleTreeItem(item)"
                  >
                    {{ item.expanded ? "▼" : "▶" }}
                  </span>
                  <span v-else class="w-6"></span>

                  <span class="json-key text-blue-600 font-semibold mr-2">
                    {{ item.key }}:
                  </span>

                  <span :class="getValueClass(item.value)" class="json-value">
                    {{ getDisplayValue(item) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Raw JSON View with Virtual Scrolling -->
      <div v-else class="raw-view">
        <div
          ref="rawContainerRef"
          class="raw-container bg-gray-900 text-gray-100"
          :style="{ height: containerHeight + 'px' }"
          @scroll="handleRawScroll"
        >
          <div :style="{ height: totalRawHeight + 'px', position: 'relative' }">
            <div
              :style="{
                transform: `translateY(${rawStartOffset}px)`,
                position: 'absolute',
                width: '100%',
              }"
            >
              <div
                v-for="(line, index) in visibleRawLines"
                :key="`raw-${index}`"
                :style="{ height: lineHeight + 'px' }"
                class="raw-line flex px-4 py-0 font-mono text-sm leading-relaxed"
              >
                <span
                  class="line-number text-gray-500 mr-4 select-none w-12 text-right"
                >
                  {{ line.number }}
                </span>
                <span class="line-content text-gray-100">{{
                  line.content
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from "vue";

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["toggle-view"]);

// Refs
const containerRef = ref(null);
const treeContainerRef = ref(null);
const rawContainerRef = ref(null);

// State
const isTreeView = ref(true);
const containerHeight = ref(400);
const itemHeight = 28;
const lineHeight = 24;
const visibleRange = ref({ start: 0, end: 0 });
const rawVisibleRange = ref({ start: 0, end: 0 });
const expandedItems = ref(new Set());
const collapsedItems = ref(new Set()); // Track explicitly collapsed items

// Make treeItems reactive to expandedItems and collapsedItems changes
const treeItems = computed(() => {
  const items = generateTreeItems(props.data, 0, "", expandedItems.value);

  return items;
});

// JSON string
const jsonString = computed(() => {
  return JSON.stringify(props.data, null, 2);
});

// Raw lines
const rawLines = computed(() => {
  return jsonString.value.split("\n").map((line, index) => ({
    number: index + 1,
    content: line,
  }));
});

const totalLines = computed(() => rawLines.value.length);

// Tree structure
const generateTreeItems = (obj, level = 0, parentPath = "", expandedSet) => {
  const items = [];

  const traverse = (value, key, currentLevel, currentPath) => {
    const id = currentPath ? `${currentPath}.${key}` : key;
    const hasChildren =
      typeof value === "object" &&
      value !== null &&
      Object.keys(value).length > 0;

    // Check if user has explicitly set this item's state
    const hasExplicitState =
      expandedSet.has(id) || collapsedItems.value.has(id);

    let isExpanded;
    if (hasExplicitState) {
      // User has explicitly expanded/collapsed this item
      isExpanded = expandedSet.has(id);
    } else {
      // Use default expansion for first two levels
      isExpanded = currentLevel < 2;
    }

    const item = {
      id,
      key,
      value,
      level: currentLevel,
      hasChildren,
      expanded: isExpanded,
      type: Array.isArray(value) ? "array" : typeof value,
    };

    items.push(item);

    if (hasChildren && item.expanded) {
      if (Array.isArray(value)) {
        value.forEach((child, index) => {
          traverse(child, `[${index}]`, currentLevel + 1, id);
        });
      } else {
        Object.entries(value).forEach(([childKey, childValue]) => {
          traverse(childValue, childKey, currentLevel + 1, id);
        });
      }
    } else if (hasChildren) {
      console.log(`  ↳ Skipping children for collapsed: ${id}`);
    }
  };

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      traverse(item, `[${index}]`, level, parentPath);
    });
  } else {
    Object.entries(obj).forEach(([key, value]) => {
      traverse(value, key, level, parentPath);
    });
  }

  return items;
};

// Virtual scrolling calculations
const totalTreeHeight = computed(() => treeItems.value.length * itemHeight);
const totalRawHeight = computed(() => rawLines.value.length * lineHeight);

const visibleItemCount = computed(
  () => Math.ceil(containerHeight.value / itemHeight) + 2
);
const visibleLineCount = computed(
  () => Math.ceil(containerHeight.value / lineHeight) + 2
);

const startOffset = computed(() => visibleRange.value.start * itemHeight);
const rawStartOffset = computed(() => rawVisibleRange.value.start * lineHeight);

const visibleTreeItems = computed(() => {
  // Ensure reactivity by accessing both treeItems and visibleRange
  const items = treeItems.value;
  const start = visibleRange.value.start;
  const end = Math.min(visibleRange.value.end, items.length);

  return items.slice(start, end);
});

const visibleRawLines = computed(() => {
  const start = rawVisibleRange.value.start;
  const end = Math.min(rawVisibleRange.value.end, rawLines.value.length);
  return rawLines.value.slice(start, end);
});

// Methods
const toggleView = () => {
  isTreeView.value = !isTreeView.value;
  emit("toggle-view", isTreeView.value);
};

const toggleTreeItem = (item) => {
  if (!item.hasChildren) return;

  const newExpandedItems = new Set(expandedItems.value);
  const newCollapsedItems = new Set(collapsedItems.value);

  if (item.expanded) {
    // Currently expanded, user wants to collapse
    newExpandedItems.delete(item.id);
    newCollapsedItems.add(item.id);
  } else {
    // Currently collapsed, user wants to expand
    newExpandedItems.add(item.id);
    newCollapsedItems.delete(item.id);
  }

  expandedItems.value = newExpandedItems;
  collapsedItems.value = newCollapsedItems;

  // Force recalculation of visible range after tree structure changes
  nextTick(() => {
    visibleRange.value = {
      start: visibleRange.value.start,
      end: Math.min(
        visibleRange.value.start + visibleItemCount.value,
        treeItems.value.length
      ),
    };
  });
};

const expandAll = () => {
  // Recursively collect all possible IDs using the same logic as generateTreeItems
  const collectAllPossibleIds = (obj, level = 0, parentPath = "") => {
    const ids = new Set();

    const traverse = (value, key, _currentLevel, currentPath) => {
      const id = currentPath ? `${currentPath}.${key}` : key;
      const hasChildren =
        typeof value === "object" &&
        value !== null &&
        Object.keys(value).length > 0;

      if (hasChildren) {
        ids.add(id);

        // Always traverse children to collect all possible IDs
        if (Array.isArray(value)) {
          value.forEach((child, index) => {
            traverse(child, `[${index}]`, _currentLevel + 1, id);
          });
        } else {
          Object.entries(value).forEach(([childKey, childValue]) => {
            traverse(childValue, childKey, _currentLevel + 1, id);
          });
        }
      }
    };

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        traverse(item, `[${index}]`, level, parentPath);
      });
    } else {
      Object.entries(obj).forEach(([key, value]) => {
        traverse(value, key, level, parentPath);
      });
    }

    return ids;
  };

  // Get all possible IDs and add them to expandedItems
  const allIds = collectAllPossibleIds(props.data);
  expandedItems.value = new Set(allIds);
  collapsedItems.value = new Set(); // Clear collapsed items

  // Force recalculation after expanding all
  nextTick(() => {
    visibleRange.value = { start: 0, end: visibleItemCount.value };
  });
};

const collapseAll = () => {
  expandedItems.value = new Set();
  // Mark all items with children as explicitly collapsed
  const allIds = [];
  const collectAllIds = (obj, level = 0, parentPath = "") => {
    const traverse = (value, key, currentLevel, currentPath) => {
      const id = currentPath ? `${currentPath}.${key}` : key;
      const hasChildren =
        typeof value === "object" &&
        value !== null &&
        Object.keys(value).length > 0;

      if (hasChildren) {
        allIds.push(id);
        if (Array.isArray(value)) {
          value.forEach((child, index) =>
            traverse(child, `[${index}]`, currentLevel + 1, id)
          );
        } else {
          Object.entries(value).forEach(([childKey, childValue]) =>
            traverse(childValue, childKey, currentLevel + 1, id)
          );
        }
      }
    };

    if (Array.isArray(obj)) {
      obj.forEach((item, index) =>
        traverse(item, `[${index}]`, level, parentPath)
      );
    } else {
      Object.entries(obj).forEach(([key, value]) =>
        traverse(value, key, level, parentPath)
      );
    }
  };

  collectAllIds(props.data);
  collapsedItems.value = new Set(allIds);

  // Force recalculation after collapsing all
  nextTick(() => {
    visibleRange.value = { start: 0, end: visibleItemCount.value };
  });
};

const handleTreeScroll = (event) => {
  const scrollTop = event.target.scrollTop;
  const start = Math.floor(scrollTop / itemHeight);
  const end = start + visibleItemCount.value;

  visibleRange.value = { start, end };
};

const handleRawScroll = (event) => {
  const scrollTop = event.target.scrollTop;
  const start = Math.floor(scrollTop / lineHeight);
  const end = start + visibleLineCount.value;

  rawVisibleRange.value = { start, end };
};

const getValueClass = (value) => {
  const type = typeof value;
  if (value === null) return "text-gray-500";
  if (type === "string") return "text-green-600";
  if (type === "number") return "text-red-600";
  if (type === "boolean") return "text-purple-600";
  if (type === "object") return "text-blue-800";
  return "text-gray-800";
};

const getDisplayValue = (item) => {
  if (item.hasChildren) {
    if (Array.isArray(item.value)) {
      return `Array(${item.value.length})`;
    } else {
      return `Object(${Object.keys(item.value).length})`;
    }
  }

  if (typeof item.value === "string") {
    return `"${item.value}"`;
  }

  return String(item.value);
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Initialize
onMounted(() => {
  // Set initial visible range
  visibleRange.value = { start: 0, end: visibleItemCount.value };
  rawVisibleRange.value = { start: 0, end: visibleLineCount.value };
});

watch(
  () => props.data,
  () => {
    // treeItems will automatically update as it's a computed property
  },
  { deep: true }
);

// Watch expandedItems changes to ensure UI updates
watch(
  expandedItems,
  (newExpanded, oldExpanded) => {
    console.log("expandedItems changed:", {
      oldSize: oldExpanded?.size || 0,
      newSize: newExpanded.size,
      added: Array.from(newExpanded).filter((id) => !oldExpanded?.has(id)),
      removed: Array.from(oldExpanded || []).filter(
        (id) => !newExpanded.has(id)
      ),
    });
  },
  { deep: true }
);

// Watch collapsedItems changes
watch(
  collapsedItems,
  (newCollapsed, oldCollapsed) => {
    console.log("collapsedItems changed:", {
      oldSize: oldCollapsed?.size || 0,
      newSize: newCollapsed.size,
      added: Array.from(newCollapsed).filter((id) => !oldCollapsed?.has(id)),
      removed: Array.from(oldCollapsed || []).filter(
        (id) => !newCollapsed.has(id)
      ),
    });
  },
  { deep: true }
);
</script>

<style scoped>
.virtual-json-viewer {
  font-family: "JetBrains Mono", "Fira Code", Consolas, "Courier New", monospace;
}

.tree-container,
.raw-container {
  overflow-y: auto;
  overflow-x: auto;
}

.tree-item {
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
}

.toggle-icon {
  user-select: none;
}

.line-number {
  flex-shrink: 0;
}

.line-content {
  white-space: pre;
  word-break: break-all;
}

/* Scrollbar styling */
.tree-container::-webkit-scrollbar,
.raw-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.tree-container::-webkit-scrollbar-track,
.raw-container::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.tree-container::-webkit-scrollbar-thumb,
.raw-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.tree-container::-webkit-scrollbar-thumb:hover,
.raw-container::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}
</style>