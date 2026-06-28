<template>
    <div class="filter-bar d-flex align-items-center gap-1 px-2 py-1 border-bottom flex-shrink-0">
        <Select
            v-model="methodFilter"
            :options="methodOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="方法"
            size="small"
            class="filter-select"
            @change="onMethodChange"
        />
        <Button
            icon="pi pi-sliders-h"
            @click="toggleAdvanced"
            :class="{ 'opt-active': selectionStore.showAdvancedFilter }"
            text
            size="small"
            v-tooltip.top="'高级过滤'"
        />
        <div class="search-input-wrapper">
            <InputText
                v-model="keyword"
                placeholder="搜索..."
                class="filter-search-input"
                @input="onKeywordInput"
            />
            <span class="search-input-icon" @click="clearKeyword">
                <i :class="keyword ? 'pi pi-times' : 'pi pi-search'"></i>
            </span>
        </div>
        <Button
            :icon="props.fullscreen ? 'pi pi-window-minimize' : 'pi pi-window-maximize'"
            @click="emit('toggle-fullscreen')"
            text
            size="small"
            v-tooltip.top="props.fullscreen ? '退出全屏' : '全屏显示'"
        />
    </div>
    <FilterBarAdvanced v-if="selectionStore.showAdvancedFilter" />
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import Select from 'primevue/select'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import FilterBarAdvanced from './FilterBarAdvanced.vue'
import { useFilterStore } from '@/stores/filter'
import { useSelectionStore } from '@/stores/selection'
import { debounce } from '@/utils/dom-utils'

const props = defineProps<{ fullscreen?: boolean }>()
const emit = defineEmits<{ 'toggle-fullscreen': [] }>()

const filterStore = useFilterStore()
const selectionStore = useSelectionStore()

const methodOptions = [
    { label: '全部', value: '' },
    { label: 'GET', value: 'GET' },
    { label: 'POST', value: 'POST' },
    { label: 'PUT', value: 'PUT' },
    { label: 'DELETE', value: 'DELETE' },
    { label: 'PATCH', value: 'PATCH' },
    { label: 'OPTIONS', value: 'OPTIONS' },
    { label: 'HEAD', value: 'HEAD' }
]

const methodFilter = ref('')
const keyword = ref('')

const onKeywordDebounced = debounce(() => {
    filterStore.setFilter('keyword', keyword.value)
}, 300)

function onMethodChange() {
    filterStore.setFilter('method', methodFilter.value)
}

function onKeywordInput() {
    onKeywordDebounced()
}

function clearKeyword() {
    if (keyword.value) {
        keyword.value = ''
        filterStore.setFilter('keyword', '')
    }
}

function toggleAdvanced() {
    selectionStore.showAdvancedFilter = !selectionStore.showAdvancedFilter
}
</script>

<style scoped>
.filter-bar {
    height: 32px;
}

.filter-select {
    width: 90px;
    height: 24px;
    font-size: 11px;
}

.filter-select :deep(.p-select-label) {
    font-size: 11px;
    padding: 0 0 0 6px;
}

.search-input-wrapper {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
}

.filter-search-input {
    width: 100%;
    height: 24px;
    padding: 0 22px 0 6px;
    font-size: 11px;
}

.search-input-icon {
    position: absolute;
    right: 4px;
    top: 50%;
    transform: translateY(-50%);
    cursor: pointer;
    color: var(--p-text-muted-color, #6c757d);
    font-size: 10px;
}

.search-input-icon:hover {
    color: var(--p-primary-color, #0d6efd);
}

.opt-active {
    background: var(--p-primary-color, #0d6efd);
    color: white;
}
</style>
