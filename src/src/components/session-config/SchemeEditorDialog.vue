<template>
    <Dialog
        v-model:visible="visible"
        :header="isEditing ? '编辑方案' : '新建方案'"
        :modal="true"
        :style="{ width: '560px' }"
        :closeOnEscape="true"
        :draggable="false"
        @show="onShow"
    >
        <div class="p-2 d-flex flex-column gap-2">
            <div class="d-flex align-items-center gap-2">
                <label class="field-label flex-shrink-0">名称</label>
                <InputText
                    v-model="form.name"
                    class="flex-grow-1"
                    placeholder="方案名称"
                />
            </div>
            <div class="d-flex align-items-center gap-2">
                <label class="field-label flex-shrink-0">域名</label>
                <InputText
                    v-model="form.domains"
                    class="flex-grow-1"
                    placeholder="多个域名用逗号分隔"
                />
            </div>
            <div class="d-flex align-items-center gap-2">
                <label class="field-label flex-shrink-0">正则</label>
                <InputText
                    v-model="form.domainRegex"
                    class="flex-grow-1"
                    placeholder="域名匹配正则 (可选)"
                />
            </div>
            <div class="d-flex align-items-start gap-2">
                <label class="field-label flex-shrink-0 mt-1">描述</label>
                <Textarea
                    v-model="form.description"
                    rows="2"
                    class="flex-grow-1"
                    placeholder="方案描述..."
                />
            </div>
            <div class="d-flex flex-column gap-1">
                <label class="field-label">字段选择</label>
                <DualListSelector
                    :fields="sessionStore.fields"
                    v-model="form.fieldIds"
                />
            </div>
            <div class="d-flex align-items-center gap-2">
                <label class="field-label flex-shrink-0">输出格式</label>
                <Select
                    v-model="form.outputFormat"
                    :options="outputFormatOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="flex-grow-1"
                />
            </div>
            <div v-if="form.outputFormat === 'custom'" class="d-flex flex-column gap-1">
                <label class="field-label">输出模板</label>
                <Textarea
                    v-model="form.outputTemplate"
                    rows="3"
                    class="w-100"
                    placeholder="使用 {{字段名}} 引用字段值，如: token={{Token}}"
                />
            </div>
        </div>
        <template #footer>
            <Button
                label="取消"
                @click="visible = false"
                text
                size="small"
            />
            <Button
                label="保存"
                @click="save"
                size="small"
            />
        </template>
    </Dialog>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import DualListSelector from './DualListSelector.vue'
import { useSessionStore } from '@/stores/session'
import { useToast } from 'primevue/usetoast'
import type { SessionScheme } from '@/types/har'

const sessionStore = useSessionStore()
const toast = useToast()

const visible = ref(false)
const editingId = ref<string | null>(null)

const form = ref({
    name: '',
    domains: '',
    domainRegex: '',
    description: '',
    fieldIds: [] as string[],
    outputFormat: 'key=value' as 'key=value' | 'json' | 'custom',
    outputTemplate: ''
})

const outputFormatOptions = [
    { label: 'Key=Value (每行一对)', value: 'key=value' },
    { label: 'JSON 格式', value: 'json' },
    { label: '自定义模板', value: 'custom' }
]

const isEditing = computed(() => editingId.value !== null)

watch(() => sessionStore.editingSchemeId, (id) => {
    if (id !== null) {
        editingId.value = id
        const scheme = sessionStore.schemes.find(s => s.id === id)
        if (scheme) {
            form.value = {
                name: scheme.name,
                domains: (scheme.targetDomains || []).join(', '),
                domainRegex: scheme.domainRegex || '',
                description: scheme.description || '',
                fieldIds: Array.isArray(scheme.fieldIds) ? [...scheme.fieldIds] : [],
                outputFormat: scheme.outputFormat || 'key=value',
                outputTemplate: scheme.outputTemplate || ''
            }
        }
        visible.value = true
    } else if (visible.value === false) {
        editingId.value = null
    }
})

watch(visible, (val) => {
    if (!val) {
        sessionStore.editingSchemeId = null
    }
})

function handleOpenNew() {
    openNew()
}

onMounted(() => {
    window.addEventListener('open-scheme-editor', handleOpenNew)
})

onUnmounted(() => {
    window.removeEventListener('open-scheme-editor', handleOpenNew)
})

function openNew() {
    editingId.value = null
    form.value = {
        name: '',
        domains: '',
        domainRegex: '',
        description: '',
        fieldIds: [],
        outputFormat: 'key=value',
        outputTemplate: ''
    }
    visible.value = true
}

function onShow() {
    // Dialog shown
}

async function save() {
    if (!form.value.name.trim()) {
        toast.add({ severity: 'warn', summary: '请输入方案名称', life: 2000 })
        return
    }

    const domains = form.value.domains
        .split(',')
        .map(d => d.trim())
        .filter(d => d.length > 0)

    const scheme: SessionScheme = {
        id: editingId.value || '',
        name: form.value.name.trim(),
        targetDomains: domains,
        domainRegex: form.value.domainRegex.trim(),
        description: form.value.description.trim(),
        fieldIds: Array.isArray(form.value.fieldIds) ? [...form.value.fieldIds] : [],
        isActive: false,
        outputFormat: form.value.outputFormat,
        outputTemplate: form.value.outputTemplate.trim() || undefined
    }

    let result
    if (editingId.value) {
        const existing = sessionStore.schemes.find(s => s.id === editingId.value)
        if (existing) scheme.isActive = existing.isActive
        result = await sessionStore.editScheme(scheme)
    } else {
        result = await sessionStore.addScheme(scheme)
    }

    if (result.success) {
        toast.add({ severity: 'success', summary: editingId.value ? '方案已更新' : '方案已创建', life: 2000 })
        visible.value = false
    } else {
        toast.add({ severity: 'error', summary: result.message || '操作失败', life: 3000 })
    }
}

defineExpose({ openNew })
</script>

<style scoped>
.field-label {
    font-size: 11px;
    width: 60px;
    text-align: right;
    white-space: nowrap;
}

:deep(.p-select),
:deep(.p-inputtext),
:deep(.p-textarea) {
    font-size: 12px;
}
</style>
