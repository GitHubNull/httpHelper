<template>
    <div class="content-panes h-100 overflow-hidden" :class="layoutClass">
        <!-- Tabs layout: show pane switcher -->
        <template v-if="selectionStore.currentLayout === 'tabs'">
            <div class="pane-tab-switcher d-flex align-items-center gap-1 px-2 border-bottom flex-shrink-0">
                <button
                    @click="selectionStore.switchPaneTab('request')"
                    :class="['pane-tab-btn', { 'tab-active': selectionStore.activePaneTab === 'request' }]"
                >
                    请求
                </button>
                <button
                    @click="selectionStore.switchPaneTab('response')"
                    :class="['pane-tab-btn', { 'tab-active': selectionStore.activePaneTab === 'response' }]"
                >
                    响应
                </button>
            </div>
            <div class="flex-grow-1 overflow-hidden">
                <RequestPane v-if="selectionStore.activePaneTab === 'request'" class="h-100" />
                <ResponsePane v-if="selectionStore.activePaneTab === 'response'" class="h-100" />
            </div>
        </template>
        <!-- Vertical / Horizontal layout: show both panes with resizer -->
        <template v-else>
            <div
                class="pane-wrapper"
                :style="paneAStyle"
            >
                <RequestPane class="h-100" />
            </div>
            <PaneResizer
                :direction="resizerDirection"
                @resize="onPaneResize"
            />
            <div
                class="pane-wrapper"
                :style="paneBStyle"
            >
                <ResponsePane class="h-100" />
            </div>
        </template>
    </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import RequestPane from './RequestPane.vue'
import ResponsePane from './ResponsePane.vue'
import PaneResizer from '../common/PaneResizer.vue'
import { useSelectionStore } from '@/stores/selection'

const selectionStore = useSelectionStore()

const layoutClass = computed(() => {
    if (selectionStore.currentLayout === 'vertical') return 'layout-vertical d-flex flex-column'
    if (selectionStore.currentLayout === 'horizontal') return 'layout-horizontal d-flex flex-row'
    return 'layout-tabs d-flex flex-column'
})

const resizerDirection = computed(() => {
    return selectionStore.currentLayout === 'horizontal' ? 'horizontal' : 'vertical'
})

const paneAStyle = computed(() => ({
    flex: `0 0 ${selectionStore.paneRatio}%`,
    overflow: 'hidden',
    minHeight: '0'
}))

const paneBStyle = computed(() => ({
    flex: `1 1 0`,
    overflow: 'hidden',
    minHeight: '0'
}))

function onPaneResize(ratio: number) {
    selectionStore.paneRatio = ratio
}
</script>

<style scoped>
.content-panes {
    min-height: 0;
}

.pane-wrapper {
    min-height: 0;
    min-width: 0;
}

.pane-tab-switcher {
    height: 26px;
}

.pane-tab-btn {
    min-width: 50px;
    height: 20px;
    padding: 0 6px;
    font-size: 11px;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    color: var(--hh-text, #212529);
    cursor: pointer;
}

.pane-tab-btn:hover {
    background: var(--hh-bg-tertiary, #e9ecef);
}

.pane-tab-btn.tab-active {
    border: 1px solid var(--hh-primary, #0d6efd);
    color: var(--hh-primary, #0d6efd);
    background: rgba(13, 110, 253, 0.1);
}
</style>
