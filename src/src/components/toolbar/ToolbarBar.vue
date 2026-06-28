<template>
    <div class="toolbar-bar d-flex align-items-center gap-2 px-2 py-1 border-bottom flex-shrink-0">
        <Button
            :class="['btn-recording', { 'recording-active': networkStore.isRecording }]"
            @click="toggleRecording"
            icon="pi pi-circle-fill"
            severity="danger"
            text
            rounded
            size="small"
            v-tooltip.top="networkStore.isRecording ? '暂停录制' : '恢复录制'"
        />
        <Button
            icon="pi pi-trash"
            @click="clearRequests"
            text
            rounded
            size="small"
            severity="secondary"
            v-tooltip.top="'清空'"
        />
        <span class="ms-auto small text-muted">
            {{ networkStore.getRequestCount() }} 条请求
        </span>
    </div>
</template>

<script lang="ts" setup>
import Button from 'primevue/button'
import { useNetworkStore } from '@/stores/network'
import { useFilterStore } from '@/stores/filter'
import { useSelectionStore } from '@/stores/selection'
import { useToast } from 'primevue/usetoast'

const networkStore = useNetworkStore()
const filterStore = useFilterStore()
const selectionStore = useSelectionStore()
const toast = useToast()

function toggleRecording() {
    networkStore.setRecording(!networkStore.isRecording)
    toast.add({
        severity: 'info',
        summary: networkStore.isRecording ? '录制已恢复' : '录制已暂停',
        life: 2000
    })
}

function clearRequests() {
    networkStore.clearRequests()
    selectionStore.clearSelection()
    filterStore.refreshDisplay()
}
</script>

<style scoped>
.toolbar-bar {
    height: 32px;
}

.btn-recording {
    opacity: 0.5;
}

.recording-active {
    opacity: 1;
    animation: pulse-recording 1.5s infinite;
}

@keyframes pulse-recording {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
}
</style>
