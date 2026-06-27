<template>
    <div class="filter-bar-advanced d-flex align-items-center gap-1 px-2 py-1 border-bottom flex-shrink-0">
        <Select
            v-model="typeFilter"
            :options="typeOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="类型"
            size="small"
            class="filter-select"
            @change="onTypeChange"
        />
        <Select
            v-model="colorFilter"
            :options="colorOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="颜色"
            size="small"
            class="filter-select"
            @change="onColorChange"
        >
            <template #value="slotProps">
                <span v-if="slotProps.value" class="color-filter-item">
                    <span class="color-dot" :style="{ background: getColorHex(slotProps.value) }"></span>
                    {{ getColorLabel(slotProps.value) }}
                </span>
                <span v-else>颜色</span>
            </template>
            <template #option="slotProps">
                <span class="color-filter-item">
                    <span class="color-dot" :style="{ background: getColorHex(slotProps.option.value) }"></span>
                    {{ slotProps.option.label }}
                </span>
            </template>
        </Select>
        <Button
            label="Re"
            @click="filterStore.toggleFilter('useRegex')"
            :class="['opt-btn', { 'opt-active': filterStore.filterState.useRegex }]"
            text
            size="small"
            v-tooltip.top="'正则搜索'"
        />
        <Button
            label="Aa"
            @click="filterStore.toggleFilter('caseSensitive')"
            :class="['opt-btn', { 'opt-active': filterStore.filterState.caseSensitive }]"
            text
            size="small"
            v-tooltip.top="'大小写敏感'"
        />
        <Button
            label="NOT"
            @click="filterStore.toggleFilter('invert')"
            :class="['opt-btn', { 'opt-active': filterStore.filterState.invert }]"
            text
            size="small"
            v-tooltip.top="'反向过滤'"
        />
    </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import Select from 'primevue/select'
import Button from 'primevue/button'
import { useFilterStore } from '@/stores/filter'
import { COLOR_MAP, COLOR_NAMES } from '@/stores/selection'

const filterStore = useFilterStore()

const typeOptions = [
    { label: '全部', value: '' },
    { label: 'JSON', value: 'json' },
    { label: 'HTML', value: 'html' },
    { label: 'XML', value: 'xml' },
    { label: 'JS', value: 'js' },
    { label: 'CSS', value: 'css' },
    { label: 'Image', value: 'image' },
    { label: 'Font', value: 'font' },
    { label: 'Binary', value: 'binary' },
    { label: 'Text', value: 'text' },
    { label: 'Other', value: 'other' }
]

const colorOptions = [
    { label: '全部', value: '' },
    { label: '无标签', value: 'none' },
    { label: '红色', value: 'red' },
    { label: '橙色', value: 'orange' },
    { label: '黄色', value: 'yellow' },
    { label: '绿色', value: 'green' },
    { label: '蓝色', value: 'blue' },
    { label: '紫色', value: 'purple' },
    { label: '粉色', value: 'pink' },
    { label: '灰色', value: 'gray' }
]

const typeFilter = ref('')
const colorFilter = ref('')

function onTypeChange() {
    filterStore.setFilter('type', typeFilter.value)
}

function onColorChange() {
    filterStore.setFilter('color', colorFilter.value)
}

function getColorHex(value: string): string {
    if (!value || value === 'none') return 'transparent'
    return COLOR_MAP[value] || 'transparent'
}

function getColorLabel(value: string): string {
    if (!value) return '颜色'
    if (value === 'none') return '无标签'
    return COLOR_NAMES[value] || value
}
</script>

<style scoped>
.filter-bar-advanced {
    height: 30px;
}

.filter-select {
    width: 80px;
    height: 24px;
    font-size: 11px;
}

.filter-select :deep(.p-select-label) {
    font-size: 11px;
    padding: 0 0 0 6px;
}

.opt-btn {
    min-width: 28px;
    height: 22px;
    padding: 0 2px;
    font-size: 10px;
    font-weight: bold;
    border: 1px solid transparent;
}

.opt-btn.opt-active {
    border: 1px solid #dc3545;
    color: #dc3545;
    background: rgba(220, 53, 69, 0.1);
}

.color-filter-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
}

.color-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.2);
}
</style>
