<template>
    <div class="pane-search-bar d-flex align-items-center px-1 border-top flex-shrink-0">
        <Button
            :class="['search-opt-btn', { 'opt-active': searchStore[pane].useRegex }]"
            @click="handleToggleRegex"
            text
            size="small"
            label="Re"
            v-tooltip.top="'正则搜索'"
        />
        <Button
            :class="['search-opt-btn', { 'opt-active': searchStore[pane].caseSensitive }]"
            @click="handleToggleCase"
            text
            size="small"
            label="Ca"
            v-tooltip.top="'大小写敏感'"
        />
        <Button
            icon="pi pi-caret-left"
            @click="handleNavigate('prev')"
            text
            size="small"
            class="search-nav-btn"
            v-tooltip.top="'上一个'"
        />
        <Button
            icon="pi pi-caret-right"
            @click="handleNavigate('next')"
            text
            size="small"
            class="search-nav-btn"
            v-tooltip.top="'下一个'"
        />
        <div class="search-input-wrapper">
            <InputText
                v-model="searchText"
                placeholder="搜索"
                class="search-input"
                @input="onSearchInput"
            />
            <span
                class="search-input-icon"
                @click="clearSearch"
            >
                <i :class="hasText ? 'pi pi-times' : 'pi pi-search'"></i>
            </span>
        </div>
        <span class="search-count small text-muted">
            {{ searchStore.getSearchCountText(pane) }}
        </span>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { useSearchStore } from '@/stores/search'
import { useSearchHighlight } from '@/composables/useSearchHighlight'
import { debounce } from '@/utils/dom-utils'

const props = defineProps<{ pane: 'req' | 'res' }>()
const searchStore = useSearchStore()
const { refreshHighlight, navigateMatch } = useSearchHighlight(props.pane)

const searchText = ref('')
const hasText = computed(() => searchText.value.length > 0)

const doSearch = debounce(() => {
    if (!searchText.value) {
        searchStore.clearSearch(props.pane)
        return
    }
    searchStore.setSearchText(props.pane, searchText.value)
    refreshHighlight()
}, 300)

function onSearchInput() {
    if (!searchText.value) {
        searchStore.clearSearch(props.pane)
        return
    }
    doSearch()
}

function clearSearch() {
    if (searchText.value) {
        searchText.value = ''
        searchStore.clearSearch(props.pane)
    }
}

function handleNavigate(dir: 'prev' | 'next') {
    navigateMatch(dir)
}

function handleToggleRegex() {
    searchStore.toggleRegex(props.pane)
    if (searchText.value) refreshHighlight()
}

function handleToggleCase() {
    searchStore.toggleCaseSensitive(props.pane)
    if (searchText.value) refreshHighlight()
}

watch(() => searchStore[props.pane].text, (val) => {
    if (val !== searchText.value) searchText.value = val
})
</script>

<style scoped>
.pane-search-bar {
    height: 24px;
    gap: 1px;
    font-size: 11px;
}

.search-opt-btn {
    min-width: 26px;
    height: 20px;
    padding: 0 2px;
    font-size: 10px;
    font-weight: bold;
    border: 1px solid transparent;
}

.search-opt-btn.opt-active {
    border: 1px solid #dc3545;
    color: #dc3545;
    background: rgba(220, 53, 69, 0.1);
}

.search-nav-btn {
    min-width: 22px;
    height: 20px;
    padding: 0;
}

.search-input-wrapper {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
}

.search-input {
    width: 100%;
    height: 20px;
    padding: 0 22px 0 4px;
    font-size: 11px;
}

.search-input-icon {
    position: absolute;
    right: 2px;
    top: 50%;
    transform: translateY(-50%);
    cursor: pointer;
    color: var(--p-text-muted-color, #6c757d);
    display: flex;
    align-items: center;
    font-size: 10px;
}

.search-input-icon:hover {
    color: var(--p-primary-color, #0d6efd);
}

.search-count {
    white-space: nowrap;
    padding: 0 4px;
    font-size: 10px;
}
</style>
