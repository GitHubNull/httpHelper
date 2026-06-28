<template>
    <div class="http-detail-area h-100 d-flex flex-column overflow-hidden">
        <Teleport :to="target" :disabled="!isFullscreen">
            <div class="fs-inner h-100 d-flex flex-column overflow-hidden">
                <LayoutBar>
                    <Button
                        class="fs-detail-btn"
                        :icon="isFullscreen ? 'pi pi-window-minimize' : 'pi pi-window-maximize'"
                        @click="toggle"
                        text
                        size="small"
                        v-tooltip.top="isFullscreen ? '退出全屏' : '全屏显示'"
                        :disabled="!isFullscreen && !selectionStore.currentRequest"
                    />
                </LayoutBar>
                <div class="flex-grow-1 overflow-hidden">
                    <ContentPanes v-if="selectionStore.currentRequest" />
                    <div v-else class="empty-state h-100 d-flex align-items-center justify-content-center">
                        <span class="text-muted small">选择一个请求查看详情</span>
                    </div>
                </div>
            </div>
        </Teleport>
        <FullscreenOverlay v-model:visible="isFullscreen" title="报文详情" ref="overlayRef" />
    </div>
</template>

<script lang="ts" setup>
import Button from 'primevue/button'
import LayoutBar from './LayoutBar.vue'
import ContentPanes from './ContentPanes.vue'
import FullscreenOverlay from '../common/FullscreenOverlay.vue'
import { useFullscreenOverlay } from '@/composables/useFullscreenOverlay'
import { useSelectionStore } from '@/stores/selection'

const selectionStore = useSelectionStore()
const { isFullscreen, overlayRef, target, toggle } = useFullscreenOverlay()
</script>

<style scoped>
.http-detail-area {
    min-width: 0;
}

.fs-inner {
    min-width: 0;
    min-height: 0;
}

.fs-detail-btn {
    margin-left: 8px;
}

.empty-state {
    color: var(--hh-text-muted, #6c757d);
}
</style>
