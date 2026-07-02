<template>
    <Dialog
        v-model:visible="visible"
        :header="isEditing ? '编辑字段' : '新建字段'"
        :modal="true"
        :style="{ width: '480px' }"
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
                    placeholder="字段名称"
                />
            </div>
            <div class="d-flex align-items-center gap-2">
                <label class="field-label flex-shrink-0">位置类型</label>
                <Select
                    v-model="form.locationType"
                    :options="locationTypeOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="flex-grow-1"
                />
            </div>
            <div v-if="isHeaderType" class="d-flex align-items-center gap-2">
                <label class="field-label flex-shrink-0">键名</label>
                <InputText
                    v-model="form.locationName"
                    class="flex-grow-1"
                    :placeholder="form.locationType === 'header' ? '请求 Header 名称 (如 Authorization)' : '响应 Header 名称 (如 Set-Cookie)'"
                />
            </div>
            <div class="d-flex align-items-center gap-2">
                <label class="field-label flex-shrink-0">匹配模式</label>
                <Select
                    v-model="form.mode"
                    :options="modeOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="flex-grow-1"
                />
            </div>
            <div v-if="form.mode !== 'full'" class="d-flex flex-column gap-1">
                <label class="field-label">匹配规则</label>
                <Textarea
                    v-model="form.pattern"
                    rows="3"
                    class="w-100"
                    :placeholder="modePatternPlaceholder"
                />
            </div>
            <div v-if="form.mode === 'full'" class="full-mode-hint small text-muted px-1">
                <i class="pi pi-info-circle me-1"></i>完整值模式：直接返回源数据的全部内容，无需匹配规则
            </div>
            <div v-if="form.mode === 'substring'" class="option-fields">
                <div class="d-flex align-items-center gap-2">
                    <label class="field-label flex-shrink-0">起始偏移</label>
                    <InputNumber
                        v-model="form.startOffset"
                        class="flex-grow-1"
                        placeholder="0"
                        :minFractionDigits="0"
                    />
                </div>
                <div class="d-flex align-items-center gap-2">
                    <label class="field-label flex-shrink-0">结束偏移</label>
                    <InputNumber
                        v-model="form.endOffset"
                        class="flex-grow-1"
                        placeholder="空=到尾"
                        :minFractionDigits="0"
                    />
                </div>
            </div>
            <div v-if="form.mode === 'regex'" class="option-fields">
                <div class="d-flex align-items-center gap-2">
                    <label class="field-label flex-shrink-0">大小写</label>
                    <ToggleSwitch
                        v-model="form.caseSensitive"
                    />
                    <span class="small text-muted">{{ form.caseSensitive ? '区分' : '不区分' }}</span>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <label class="field-label flex-shrink-0">捕获组</label>
                    <InputNumber
                        v-model="form.groupIndex"
                        class="flex-grow-1"
                        placeholder="0"
                        :min="0"
                        :minFractionDigits="0"
                    />
                </div>
            </div>
            <div v-if="form.mode === 'keyword'" class="option-fields">
                <div class="d-flex align-items-center gap-2">
                    <label class="field-label flex-shrink-0">上下文</label>
                    <InputNumber
                        v-model="form.context"
                        class="flex-grow-1"
                        placeholder="50"
                        :min="0"
                        :minFractionDigits="0"
                    />
                </div>
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
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import InputNumber from 'primevue/inputnumber'
import ToggleSwitch from 'primevue/toggleswitch'
import { useSessionStore } from '@/stores/session'
import { useToast } from 'primevue/usetoast'
import type { SessionField } from '@/types/har'

const sessionStore = useSessionStore()
const toast = useToast()

const visible = ref(false)
const editingId = ref<string | null>(null)

const form = ref({
    name: '',
    locationType: 'header',
    locationName: '',
    mode: 'full',
    pattern: '',
    startOffset: null as number | null,
    endOffset: null as number | null,
    caseSensitive: false,
    groupIndex: 0,
    context: 50
})

const isEditing = computed(() => editingId.value !== null)

const isHeaderType = computed(() => form.value.locationType === 'header' || form.value.locationType === 'response-header')

const modePatternPlaceholder = computed(() => {
    switch (form.value.mode) {
        case 'substring': return '输入要匹配的子串，如 Bearer '
        case 'regex': return '输入正则表达式，如 Bearer ([\w.-]+)'
        case 'keyword': return '输入关键词，如 session_id'
        case 'xpath': return '输入 XPath 表达式，如 //user/id'
        case 'jsonpath': return '输入 JSONPath 表达式，如 $.data.token'
        default: return '输入匹配规则...'
    }
})

const locationTypeOptions = [
    { label: '请求 Header', value: 'header' },
    { label: '请求 Body', value: 'body' },
    { label: '响应 Header', value: 'response-header' },
    { label: '响应 Body', value: 'response-body' }
]

const modeOptions = [
    { label: '完整值 (full)', value: 'full' },
    { label: '子串匹配 (substring)', value: 'substring' },
    { label: '正则匹配 (regex)', value: 'regex' },
    { label: '关键词 (keyword)', value: 'keyword' },
    { label: 'XPath', value: 'xpath' },
    { label: 'JSONPath', value: 'jsonpath' }
]

watch(() => form.value.locationType, (newType) => {
    if (editingId.value !== null) return
    if (newType === 'header' || newType === 'response-header') {
        form.value.mode = 'full'
    }
})

watch(() => sessionStore.editingFieldId, (id) => {
    if (id !== null) {
        editingId.value = id
        const field = sessionStore.fields.find(f => f.id === id)
        if (field) {
            const opts = field.options || {}
            form.value = {
                name: field.name,
                locationType: field.location?.type || 'header',
                locationName: field.location?.name || '',
                mode: field.mode || 'substring',
                pattern: field.pattern || '',
                startOffset: opts.startOffset ?? null,
                endOffset: opts.endOffset ?? null,
                caseSensitive: opts.caseSensitive || false,
                groupIndex: opts.groupIndex || 0,
                context: opts.context || 50
            }
        }
        visible.value = true
    } else if (visible.value === false) {
        editingId.value = null
    }
})

function handleOpenNew() {
    openNew()
}

onMounted(() => {
    window.addEventListener('open-field-editor', handleOpenNew)
})

onUnmounted(() => {
    window.removeEventListener('open-field-editor', handleOpenNew)
})

watch(visible, (val) => {
    if (!val) {
        sessionStore.editingFieldId = null
    }
})

function openNew() {
    editingId.value = null
    form.value = {
        name: '',
        locationType: 'header',
        locationName: '',
        mode: 'full',
        pattern: '',
        startOffset: null,
        endOffset: null,
        caseSensitive: false,
        groupIndex: 0,
        context: 50
    }
    visible.value = true
}

function onShow() {
    // Focus first input
}

async function save() {
    if (!form.value.name.trim()) {
        toast.add({ severity: 'warn', summary: '请输入字段名称', life: 2000 })
        return
    }
    if (form.value.mode !== 'full' && !form.value.pattern.trim()) {
        toast.add({ severity: 'warn', summary: '请输入匹配规则', life: 2000 })
        return
    }

    const options: Record<string, any> = {}
    if (form.value.mode === 'substring') {
        if (form.value.startOffset != null) options.startOffset = form.value.startOffset
        if (form.value.endOffset != null) options.endOffset = form.value.endOffset
    } else if (form.value.mode === 'regex') {
        options.caseSensitive = form.value.caseSensitive
        if (form.value.groupIndex != null) options.groupIndex = form.value.groupIndex
    } else if (form.value.mode === 'keyword') {
        if (form.value.context != null) options.context = form.value.context
    }

    const field: SessionField = {
        id: editingId.value || '',
        name: form.value.name.trim(),
        location: {
            type: form.value.locationType,
            name: form.value.locationName.trim()
        },
        mode: form.value.mode,
        pattern: form.value.pattern,
        enabled: true,
        options: Object.keys(options).length > 0 ? options : undefined
    }

    let result
    if (editingId.value) {
        result = await sessionStore.editField(field)
    } else {
        result = await sessionStore.addField(field)
    }

    if (result.success) {
        toast.add({ severity: 'success', summary: editingId.value ? '字段已更新' : '字段已创建', life: 2000 })
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

.option-fields {
    padding: 4px 0 0 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    border-top: 1px solid var(--p-content-border-color, #dee2e6);
    margin-top: 2px;
}
</style>
