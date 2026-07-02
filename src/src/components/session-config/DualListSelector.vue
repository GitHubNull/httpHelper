<template>
    <div class="dual-list-selector d-flex gap-1">
        <div class="flex-grow-1 d-flex flex-column">
            <div class="dual-list-header px-1 border-bottom small fw-bold">可用</div>
            <Listbox
                v-model="availableSelected"
                :options="availableOptions"
                optionLabel="label"
                optionValue="id"
                multiple
                filter
                class="flex-grow-1 dual-list-box"
            />
        </div>
        <div class="d-flex flex-column justify-content-center gap-1">
            <Button
                icon="pi pi-angle-right"
                @click="moveRight"
                size="small"
                :disabled="availableSelected.length === 0"
                v-tooltip.top="'添加'"
            />
            <Button
                icon="pi pi-angle-left"
                @click="moveLeft"
                size="small"
                :disabled="selectedSelected.length === 0"
                v-tooltip.top="'移除'"
            />
            <Button
                icon="pi pi-angle-double-right"
                @click="moveAllRight"
                size="small"
                :disabled="availableOptions.length === 0"
                v-tooltip.top="'全部添加'"
            />
            <Button
                icon="pi pi-angle-double-left"
                @click="moveAllLeft"
                size="small"
                :disabled="modelValue.length === 0"
                v-tooltip.top="'全部移除'"
            />
        </div>
        <div class="flex-grow-1 d-flex flex-column">
            <div class="dual-list-header px-1 border-bottom small fw-bold">已选</div>
            <Listbox
                v-model="selectedSelected"
                :options="selectedOptions"
                optionLabel="label"
                optionValue="id"
                multiple
                filter
                class="flex-grow-1 dual-list-box"
            />
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import Listbox from 'primevue/listbox'
import Button from 'primevue/button'
import type { SessionField } from '@/types/har'

const props = defineProps<{
    fields: SessionField[]
}>()

const modelValue = defineModel<string[]>({ default: () => [] })

// Defensive: ensure modelValue stays as array even if Vue/PrimeVue corrupts it
watch(modelValue, (val) => {
    if (Array.isArray(val)) return  // 正常情况快速返回
    console.warn('[DualListSelector] modelValue corrupted, resetting to []', val)
    modelValue.value = []
}, { immediate: true })

const availableSelected = ref<string[]>([])
const selectedSelected = ref<string[]>([])

const availableOptions = computed(() => {
    const selected = Array.isArray(modelValue.value) ? modelValue.value : []
    return props.fields
        .filter(f => !selected.includes(f.id))
        .map(f => ({ id: f.id, label: `${f.name} (${f.mode})` }))
})

const selectedOptions = computed(() => {
    const selected = Array.isArray(modelValue.value) ? modelValue.value : []
    return props.fields
        .filter(f => selected.includes(f.id))
        .map(f => ({ id: f.id, label: `${f.name} (${f.mode})` }))
})

function moveRight() {
    const current = Array.isArray(modelValue.value) ? modelValue.value : []
    modelValue.value = [...current, ...availableSelected.value]
    availableSelected.value = []
}

function moveLeft() {
    const current = Array.isArray(modelValue.value) ? modelValue.value : []
    modelValue.value = current.filter(id => !selectedSelected.value.includes(id))
    selectedSelected.value = []
}

function moveAllRight() {
    modelValue.value = props.fields.map(f => f.id)
    availableSelected.value = []
}

function moveAllLeft() {
    modelValue.value = []
    selectedSelected.value = []
}
</script>

<style scoped>
.dual-list-selector {
    height: 160px;
    font-size: 11px;
}

.dual-list-header {
    height: 20px;
    line-height: 20px;
}

.dual-list-box {
    font-size: 11px;
    border: none;
    border-radius: 0;
}

:deep(.p-listbox-list-container) {
    min-height: 100px;
}

:deep(.p-listbox-option) {
    padding: 1px 4px;
    font-size: 11px;
}
</style>
