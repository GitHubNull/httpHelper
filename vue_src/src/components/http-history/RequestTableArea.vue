<template>
    <div class="request-table-area h-100 d-flex flex-column overflow-hidden">
        <Teleport :to="target" :disabled="!isFullscreen">
            <div class="fs-table-inner h-100 d-flex flex-column overflow-hidden">
                <FilterBar :fullscreen="isFullscreen" @toggle-fullscreen="toggle" />
                <div class="flex-grow-1 overflow-hidden table-scroll-container">
                    <RequestTable />
                </div>
            </div>
        </Teleport>
        <FullscreenOverlay v-model:visible="isFullscreen" title="请求列表" ref="overlayRef" />
    </div>
</template>

<script lang="ts" setup>
import FilterBar from './FilterBar.vue'
import RequestTable from './RequestTable.vue'
import FullscreenOverlay from '../common/FullscreenOverlay.vue'
import { useFullscreenOverlay } from '@/composables/useFullscreenOverlay'

const { isFullscreen, overlayRef, target, toggle } = useFullscreenOverlay()
</script>

<style scoped>
.request-table-area {
    min-width: 0;
    min-height: 0;
}

.fs-table-inner {
    min-width: 0;
    min-height: 0;
}

.table-scroll-container {
    min-height: 0;
    display: flex;
    flex-direction: column;
}
</style>
