<template>
    <div class="fields-management h-100 d-flex flex-column overflow-hidden">
        <div class="mgmt-toolbar d-flex align-items-center gap-2 px-2 py-1 border-bottom flex-shrink-0">
            <Button
                label="新建字段"
                icon="pi pi-plus"
                @click="openNewField"
                size="small"
            />
            <div class="search-input-wrapper">
                <InputText
                    v-model="searchText"
                    placeholder="搜索字段..."
                    class="mgmt-search-input"
                    @input="onSearchInput"
                />
                <span class="search-input-icon" @click="clearSearch">
                    <i :class="searchText ? 'pi pi-times' : 'pi pi-search'"></i>
                </span>
            </div>
        </div>
        <div class="flex-grow-1 overflow-auto">
            <DataTable
                :value="sessionStore.filteredFields"
                size="small"
                scrollable
                scrollHeight="flex"
                :rowClass="getRowClass"
            >
                <Column field="index" header="#" :style="{ width: '36px' }">
                    <template #body="{ index }">
                        <span class="text-muted">{{ index + 1 }}</span>
                    </template>
                </Column>
                <Column field="enabled" header="启用" :style="{ width: '50px' }">
                    <template #body="{ data }">
                        <ToggleSwitch
                            :modelValue="data.enabled !== false"
                            @update:modelValue="(val) => onToggleEnabled(data, val)"
                        />
                    </template>
                </Column>
                <Column field="name" header="名称" :style="{ width: '120px' }">
                    <template #body="{ data }">
                        {{ data.name }}
                    </template>
                </Column>
                <Column field="location.type" header="位置类型" :style="{ width: '80px' }">
                    <template #body="{ data }">
                        {{ data.location ? data.location.type : '' }}
                    </template>
                </Column>
                <Column field="location.name" header="键名" :style="{ width: '100px' }">
                    <template #body="{ data }">
                        {{ data.location ? (data.location.name || '-') : '' }}
                    </template>
                </Column>
                <Column field="mode" header="模式" :style="{ width: '80px' }">
                    <template #body="{ data }">
                        <span class="badge bg-secondary">{{ data.mode }}</span>
                    </template>
                </Column>
                <Column field="pattern" header="规则" :style="{ minWidth: '150px' }">
                    <template #body="{ data }">
                        <code class="small">{{ data.pattern || '' }}</code>
                    </template>
                </Column>
                <Column field="usedBy" header="使用方案" :style="{ width: '120px' }">
                    <template #body="{ data }">
                        {{ getUsedByNames(data) }}
                    </template>
                </Column>
                <Column field="actions" header="操作" :style="{ width: '70px' }">
                    <template #body="{ data }">
                        <Button
                            icon="pi pi-pencil"
                            @click="editField(data)"
                            text
                            size="small"
                            v-tooltip.top="'编辑'"
                        />
                        <Button
                            icon="pi pi-trash"
                            @click="deleteField(data)"
                            text
                            size="small"
                            severity="danger"
                            v-tooltip.top="'删除'"
                        />
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import ToggleSwitch from 'primevue/toggleswitch'
import { useSessionStore } from '@/stores/session'
import { useToast } from 'primevue/usetoast'
import { debounce } from '@/utils/dom-utils'
import type { SessionField } from '@/types/har'

const sessionStore = useSessionStore()
const toast = useToast()

const searchText = ref('')

const onSearchDebounced = debounce(() => {
    sessionStore.fieldsSearchText = searchText.value
}, 300)

function onSearchInput() {
    onSearchDebounced()
}

function clearSearch() {
    if (searchText.value) {
        searchText.value = ''
        sessionStore.fieldsSearchText = ''
    }
}

async function onToggleEnabled(field: SessionField, enabled: boolean) {
    await sessionStore.toggleField(field.id, enabled)
}

function getUsedByNames(field: SessionField): string {
    const schemes = sessionStore.schemes.filter(s => s.fieldIds && s.fieldIds.includes(field.id))
    return schemes.length > 0 ? schemes.map(s => s.name).join(', ') : '-'
}

function getRowClass(data: SessionField): string {
    return data.enabled === false ? 'row-disabled' : ''
}

function openNewField() {
    sessionStore.editingFieldId = null
    // Trigger the FieldEditorDialog to open in "new" mode
    // We need to emit or use a different mechanism
    // Since FieldEditorDialog watches editingFieldId, we set it to null and then trigger openNew
    triggerFieldEditor()
}

function editField(field: SessionField) {
    sessionStore.editingFieldId = field.id
}

async function deleteField(field: SessionField) {
    if (!confirm(`确定删除字段 "${field.name}" 吗？`)) return
    await sessionStore.removeField(field.id)
    toast.add({ severity: 'success', summary: '字段已删除', life: 2000 })
}

// Use a custom event to trigger FieldEditorDialog's openNew method
function triggerFieldEditor() {
    // The FieldEditorDialog is rendered at App.vue level and watches editingFieldId
    // For "new" mode, we need a different trigger. Let's use a custom event.
    window.dispatchEvent(new CustomEvent('open-field-editor'))
}
</script>

<style scoped>
.mgmt-toolbar {
    height: 32px;
}

.search-input-wrapper {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
}

.mgmt-search-input {
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
    color: var(--hh-text-muted, #6c757d);
    font-size: 10px;
}

.search-input-icon:hover {
    color: var(--p-primary-color, #0d6efd);
}

:deep(.p-datatable) {
    font-size: 12px;
}

:deep(.p-datatable-thead th) {
    padding: 2px 4px;
    font-size: 11px;
}

:deep(.p-datatable-tbody td) {
    padding: 2px 4px;
    font-size: 12px;
}

:deep(.row-disabled) {
    opacity: 0.5;
}

.badge {
    display: inline-block;
    padding: 1px 6px;
    font-size: 10px;
    border-radius: 3px;
    background: var(--hh-badge-bg, #6c757d);
    color: white;
}

:deep(code) {
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 11px;
    word-break: break-all;
}
</style>
