<template>
    <div class="request-table-wrapper h-100 d-flex flex-column overflow-hidden">
        <div class="table-toolbar d-flex align-items-center gap-1 px-2 border-bottom flex-shrink-0">
            <Button
                icon="pi pi-table"
                @click="toggleColumnConfig"
                text
                size="small"
                v-tooltip.top="'列配置'"
                aria-haspopup="true"
                aria-controls="col-config-popover"
            />
            <Popover ref="colConfigPopover">
                <div class="col-config-list" @click.stop>
                    <div
                        v-for="col in allColumns"
                        :key="col.field"
                        class="col-config-item"
                    >
                        <Checkbox
                            v-model="col.visible"
                            :binary="true"
                            :disabled="col.mandatory"
                            :inputId="`col-vis-${col.field}`"
                        />
                        <label :for="`col-vis-${col.field}`" class="col-config-label">
                            {{ col.header || '#' }}{{ col.mandatory ? ' *' : '' }}
                        </label>
                    </div>
                </div>
            </Popover>
            <span class="ms-auto small text-muted">
                {{ filterStore.displayedRequests.length }} / {{ networkStore.getRequestCount() }} 条
            </span>
        </div>
        <DataTable
            :value="filterStore.displayedRequests"
            v-model:selection="selectedRow"
            selectionMode="single"
            @row-click="onRowClick"
            @row-contextmenu="onRowContextMenu"
            :resizableColumns="true"
            columnResizeMode="expand"
            :reorderableColumns="true"
            size="small"
            scrollable
            scrollHeight="flex"
            :rowClass="getRowClass"
            class="flex-grow-1"
        >
            <Column
                v-for="col in visibleColumns"
                :key="col.field"
                :field="col.field"
                :sortable="false"
                :reorderable="col.field !== 'index'"
                :style="{ width: col.width }"
            >
                <template #header>
                    <span
                        v-if="col.sortable"
                        @click.stop="filterStore.toggleSort(col.field)"
                        class="sortable-header"
                    >
                        {{ col.header }}
                        <span v-if="filterStore.sortState.column === col.field" class="sort-indicator">
                            {{ filterStore.sortState.direction === 'asc' ? '▲' : '▼' }}
                        </span>
                    </span>
                    <span v-else>{{ col.header }}</span>
                </template>
                <template #body="{ data, index }">
                    <template v-if="col.field === 'index'">
                        <span class="text-muted">{{ index + 1 }}</span>
                    </template>
                    <template v-else-if="col.field === 'color'">
                        <span
                            class="color-tag"
                            :style="{ background: getColorHex(data) }"
                            @click.stop="openColorPicker($event, data)"
                        ></span>
                    </template>
                    <template v-else-if="col.field === 'method'">
                        {{ data.request.method }}
                    </template>
                    <template v-else-if="col.field === 'host'">
                        {{ getHost(data) }}
                    </template>
                    <template v-else-if="col.field === 'url'">
                        {{ getUrl(data) }}
                    </template>
                    <template v-else-if="col.field === 'status'">
                        {{ data.response ? data.response.status : '' }}
                    </template>
                    <template v-else-if="col.field === 'type'">
                        {{ getResourceCategory(data) }}
                    </template>
                    <template v-else-if="col.field === 'length'">
                        {{ getLength(data) }}
                    </template>
                    <template v-else-if="col.field === 'reqtime'">
                        {{ formatTime(data._reqStartTime) }}
                    </template>
                    <template v-else-if="col.field === 'restime'">
                        {{ formatTime(data._resEndTime) }}
                    </template>
                    <template v-else-if="col.field === 'time'">
                        {{ data.time ? data.time.toFixed(0) + 'ms' : '' }}
                    </template>
                    <template v-else-if="col.field === 'note'">
                        <span
                            class="note-cell"
                            @click.stop="openNoteEditor(data)"
                        >{{ networkStore.getRequestMeta(data._uid).note || '' }}</span>
                    </template>
                </template>
            </Column>
        </DataTable>
        <ContextMenu ref="contextMenu" :model="contextMenuItems" />
        <ColorPicker ref="colorPickerRef" />
    </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Popover from 'primevue/popover'
import Checkbox from 'primevue/checkbox'
import ColorPicker from '../common/ColorPicker.vue'
import { useFilterStore } from '@/stores/filter'
import { useNetworkStore } from '@/stores/network'
import { useSelectionStore, COLOR_MAP } from '@/stores/selection'
import { getResourceCategory, formatTimestamp, truncateUrl } from '@/utils/string-utils'
import ContextMenu from 'primevue/contextmenu'
import { useToast } from 'primevue/usetoast'
import { copyText } from '@/utils/clipboard-utils'
import { buildRawRequest } from '@/utils/content-formatter'
import type { HarEntry } from '@/types/har'

const filterStore = useFilterStore()
const networkStore = useNetworkStore()
const selectionStore = useSelectionStore()
const colorPickerRef = ref()
const colConfigPopover = ref()
const toast = useToast()
const contextMenu = ref()
const contextMenuRow = ref<HarEntry | null>(null)

const allColumns = ref([
    { field: 'index', header: '#', sortable: true, width: '40px', visible: true, mandatory: true },
    { field: 'color', header: '', sortable: true, width: '28px', visible: true, mandatory: true },
    { field: 'method', header: '方法', sortable: true, width: '60px', visible: true },
    { field: 'host', header: '主机', sortable: true, width: '150px', visible: true },
    { field: 'url', header: '路径', sortable: true, width: '300px', visible: true },
    { field: 'status', header: '状态', sortable: true, width: '50px', visible: true },
    { field: 'type', header: '类型', sortable: true, width: '60px', visible: true },
    { field: 'length', header: '长度', sortable: true, width: '60px', visible: true },
    { field: 'reqtime', header: '请求时间', sortable: true, width: '120px', visible: true },
    { field: 'restime', header: '响应时间', sortable: true, width: '120px', visible: true },
    { field: 'time', header: '耗时', sortable: true, width: '60px', visible: true },
    { field: 'note', header: '备注', sortable: true, width: '80px', visible: true }
])

const visibleColumns = computed(() => allColumns.value.filter(c => c.visible))

function toggleColumnConfig(event: Event) {
    colConfigPopover.value.show(event)
}
const selectedRow = ref(null)

function onRowClick(event: any) {
    const request = event.data as HarEntry
    selectionStore.selectRequest(request)
}

function getColorHex(data: HarEntry): string {
    const color = networkStore.getRequestMeta(data._uid).color
    return color ? (COLOR_MAP[color] || 'transparent') : 'transparent'
}

function getHost(data: HarEntry): string {
    try {
        return new URL(data.request.url).hostname
    } catch {
        return data.request.url
    }
}

function getUrl(data: HarEntry): string {
    return truncateUrl(data.request.url)
}

function getLength(data: HarEntry): string {
    const size = data.response?.content?.size || 0
    if (size > 1024) return (size / 1024).toFixed(1) + 'K'
    return String(size)
}

function formatTime(time: string | null | undefined): string {
    if (!time) return ''
    try {
        return formatTimestamp(time)
    } catch {
        return ''
    }
}

function getRowClass(data: HarEntry): string {
    const color = networkStore.getRequestMeta(data._uid).color
    return color ? `row-color-${color}` : ''
}

function openColorPicker(event: Event, data: HarEntry) {
    colorPickerRef.value?.open(event, data._uid)
}

function openNoteEditor(data: HarEntry) {
    const uid = data._uid || 0
    if (!uid) return
    const meta = networkStore.getRequestMeta(uid)
    selectionStore.setNoteEditing(uid, meta.note)
}

const contextMenuItems = [
    {
        label: '复制URL',
        icon: 'pi pi-link',
        command: () => copyUrl()
    },
    {
        label: '复制Path',
        icon: 'pi pi-directions',
        command: () => copyPath()
    },
    {
        label: '复制Headers',
        icon: 'pi pi-copy',
        command: () => copyHeaders()
    }
]

function onRowContextMenu(event: any) {
    const request = event.data as HarEntry
    contextMenuRow.value = request
    selectionStore.selectRequest(request)
    contextMenu.value.show(event.originalEvent)
}

function copyUrl() {
    if (!contextMenuRow.value) return
    copyText(contextMenuRow.value.request.url).then(ok => {
        toast.add({ severity: 'success', summary: ok ? 'URL已复制' : '复制失败', life: 2000 })
    })
}

function copyPath() {
    if (!contextMenuRow.value) return
    const path = truncateUrl(contextMenuRow.value.request.url)
    copyText(path).then(ok => {
        toast.add({ severity: 'success', summary: ok ? 'Path已复制' : '复制失败', life: 2000 })
    })
}

function copyHeaders() {
    if (!contextMenuRow.value) return
    const raw = buildRawRequest(contextMenuRow.value.request)
    const headers = raw.split('\r\n\r\n')[0]
    copyText(headers).then(ok => {
        toast.add({ severity: 'success', summary: ok ? '请求头已复制' : '复制失败', life: 2000 })
    })
}
</script>

<style scoped>
.request-table-wrapper {
    min-height: 0;
}

.table-toolbar {
    height: 24px;
}

.col-config-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px;
    min-width: 100px;
}

.col-config-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    cursor: pointer;
}

.col-config-label {
    cursor: pointer;
    user-select: none;
}

:deep(.p-datatable) {
    font-size: 12px;
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

:deep(.p-datatable-flex-scrollable) {
    height: 100%;
    display: flex;
    flex-direction: column;
}

:deep(.p-datatable-scrollable .p-datatable-table-container) {
    flex: 1;
    overflow: auto;
    min-height: 0;
}

:deep(.p-datatable-thead th) {
    padding: 2px 4px;
    font-size: 11px;
}

:deep(.p-datatable-tbody td) {
    padding: 2px 4px;
    font-size: 12px;
}

.sortable-header {
    cursor: pointer;
    user-select: none;
    display: inline-flex;
    align-items: center;
    gap: 2px;
}

.sort-indicator {
    font-size: 9px;
    color: var(--p-primary-color, #0d6efd);
}

.color-tag {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.2);
    cursor: pointer;
}

.note-cell {
    cursor: pointer;
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
