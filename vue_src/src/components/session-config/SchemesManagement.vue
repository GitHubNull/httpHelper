<template>
    <div class="schemes-management h-100 d-flex flex-column overflow-hidden">
        <div class="mgmt-toolbar d-flex align-items-center gap-2 px-2 py-1 border-bottom flex-shrink-0">
            <Button
                label="新建方案"
                icon="pi pi-plus"
                @click="openNewScheme"
                size="small"
            />
            <div class="search-input-wrapper">
                <InputText
                    v-model="searchText"
                    placeholder="搜索方案..."
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
                :value="sessionStore.filteredSchemes"
                size="small"
                scrollable
                scrollHeight="flex"
            >
                <Column field="index" header="#" :style="{ width: '36px' }">
                    <template #body="{ index }">
                        <span class="text-muted">{{ index + 1 }}</span>
                    </template>
                </Column>
                <Column field="isActive" header="激活" :style="{ width: '50px' }">
                    <template #body="{ data }">
                        <ToggleSwitch
                            :modelValue="data.isActive"
                            @update:modelValue="(val) => onToggleActive(data, val)"
                        />
                    </template>
                </Column>
                <Column field="name" header="名称" :style="{ width: '120px' }">
                    <template #body="{ data }">
                        <strong>{{ data.name }}</strong>
                    </template>
                </Column>
                <Column field="domains" header="域名" :style="{ minWidth: '150px' }">
                    <template #body="{ data }">
                        {{ (data.targetDomains || []).join(', ') }}
                    </template>
                </Column>
                <Column field="domainRegex" header="正则" :style="{ width: '120px' }">
                    <template #body="{ data }">
                        <code class="small">{{ data.domainRegex || '' }}</code>
                    </template>
                </Column>
                <Column field="description" header="描述" :style="{ minWidth: '150px' }">
                    <template #body="{ data }">
                        {{ data.description || '' }}
                    </template>
                </Column>
                <Column field="fieldCount" header="字段数" :style="{ width: '60px' }">
                    <template #body="{ data }">
                        {{ (data.fieldIds || []).length }}
                    </template>
                </Column>
                <Column field="actions" header="操作" :style="{ width: '70px' }">
                    <template #body="{ data }">
                        <Button
                            icon="pi pi-pencil"
                            @click="editScheme(data)"
                            text
                            size="small"
                            v-tooltip.top="'编辑'"
                        />
                        <Button
                            icon="pi pi-trash"
                            @click="deleteScheme(data)"
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
import type { SessionScheme } from '@/types/har'

const sessionStore = useSessionStore()
const toast = useToast()

const searchText = ref('')

const onSearchDebounced = debounce(() => {
    sessionStore.schemesSearchText = searchText.value
}, 300)

function onSearchInput() {
    onSearchDebounced()
}

function clearSearch() {
    if (searchText.value) {
        searchText.value = ''
        sessionStore.schemesSearchText = ''
    }
}

function openNewScheme() {
    sessionStore.editingSchemeId = null
    window.dispatchEvent(new CustomEvent('open-scheme-editor'))
}

function editScheme(scheme: SessionScheme) {
    sessionStore.editingSchemeId = scheme.id
}

async function deleteScheme(scheme: SessionScheme) {
    if (!confirm(`确定删除方案 "${scheme.name}" 吗？`)) return
    await sessionStore.removeScheme(scheme.id)
    toast.add({ severity: 'success', summary: '方案已删除', life: 2000 })
}

async function onToggleActive(scheme: SessionScheme, active: boolean) {
    if (active) {
        await sessionStore.activateScheme(scheme.id)
        toast.add({ severity: 'success', summary: `方案 "${scheme.name}" 已激活`, life: 2000 })
    } else {
        await sessionStore.activateScheme(null)
        toast.add({ severity: 'info', summary: '方案已停用', life: 2000 })
    }
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

:deep(code) {
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 11px;
    word-break: break-all;
}
</style>
