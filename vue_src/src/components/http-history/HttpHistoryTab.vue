<template>
    <div class="http-history-tab h-100 d-flex overflow-hidden">
        <div class="table-area-wrapper" :style="tableAreaStyle">
            <RequestTableArea class="h-100" />
        </div>
        <PaneResizer
            direction="horizontal"
            @resize="onTableResize"
        />
        <div class="detail-area-wrapper" :style="detailAreaStyle">
            <HttpDetailArea class="h-100" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import RequestTableArea from './RequestTableArea.vue'
import HttpDetailArea from './HttpDetailArea.vue'
import PaneResizer from '../common/PaneResizer.vue'
import { useSelectionStore } from '@/stores/selection'

const selectionStore = useSelectionStore()

const tableAreaStyle = computed(() => ({
    flex: `0 0 ${selectionStore.tableRatio}%`,
    overflow: 'hidden',
    minWidth: '200px',
    minHeight: '0'
}))

const detailAreaStyle = computed(() => ({
    flex: '1 1 0',
    overflow: 'hidden',
    minWidth: '0',
    minHeight: '0'
}))

function onTableResize(ratio: number) {
    selectionStore.tableRatio = ratio
}
</script>

<style scoped>
.http-history-tab {
    min-height: 0;
}

.table-area-wrapper {
    min-height: 0;
}

.detail-area-wrapper {
    min-height: 0;
}
</style>
