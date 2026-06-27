<template>
    <div class="layout-bar d-flex align-items-center gap-1 px-1 py-0 border-bottom flex-shrink-0">
        <Button
            icon="pi pi-arrows-v"
            @click="setLayout('vertical')"
            :class="{ 'layout-active': selectionStore.currentLayout === 'vertical' }"
            text
            size="small"
            v-tooltip.top="'上下布局'"
        />
        <Button
            icon="pi pi-arrows-h"
            @click="setLayout('horizontal')"
            :class="{ 'layout-active': selectionStore.currentLayout === 'horizontal' }"
            text
            size="small"
            v-tooltip.top="'左右布局'"
        />
        <Button
            icon="pi pi-credit-card"
            @click="setLayout('tabs')"
            :class="{ 'layout-active': selectionStore.currentLayout === 'tabs' }"
            text
            size="small"
            v-tooltip.top="'标签布局'"
        />
    </div>
</template>

<script lang="ts" setup>
import Button from 'primevue/button'
import { useSelectionStore, type LayoutType } from '@/stores/selection'

const selectionStore = useSelectionStore()

function setLayout(layout: LayoutType) {
    selectionStore.setLayout(layout)
}
</script>

<style scoped>
.layout-bar {
    height: 26px;
}

.layout-bar :deep(.p-button) {
    width: 28px;
    height: 22px;
    padding: 0;
    color: var(--hh-text, #212529);
}

.layout-bar :deep(.p-button:hover) {
    background: var(--hh-bg-tertiary, #e9ecef);
    color: var(--hh-primary, #0d6efd);
}

.layout-bar :deep(.layout-active) {
    color: var(--hh-primary, #0d6efd) !important;
    background: rgba(13, 110, 253, 0.15) !important;
}

.layout-bar :deep(.layout-active:hover) {
    color: var(--hh-primary, #0d6efd) !important;
    background: rgba(13, 110, 253, 0.25) !important;
}
</style>
