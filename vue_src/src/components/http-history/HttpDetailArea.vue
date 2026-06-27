<template>
    <div class="http-detail-area h-100 d-flex flex-column overflow-hidden">
        <LayoutBar />
        <div class="flex-grow-1 overflow-hidden">
            <ContentPanes v-if="selectionStore.currentRequest" />
            <div v-else class="empty-state h-100 d-flex align-items-center justify-content-center">
                <span class="text-muted small">选择一个请求查看详情</span>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import LayoutBar from './LayoutBar.vue'
import ContentPanes from './ContentPanes.vue'
import { useSelectionStore } from '@/stores/selection'

const selectionStore = useSelectionStore()
</script>

<style scoped>
.http-detail-area {
    min-width: 0;
}

.empty-state {
    color: var(--hh-text-muted, #6c757d);
}
</style>
