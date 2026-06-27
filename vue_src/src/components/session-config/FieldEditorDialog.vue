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
            <div class="d-flex align-items-center gap-2">
                <label class="field-label flex-shrink-0">位置名称</label>
                <InputText
                    v-model="form.locationName"
                    class="flex-grow-1"
                    :placeholder="form.locationType === 'header' ? 'Header名称' : 'Body'"
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
            <div class="d-flex flex-column gap-1">
                <label class="field-label">匹配规则</label>
                <Textarea
                    v-model="form.pattern"
                    rows="3"
                    class="w-100"
                    placeholder="输入匹配规则..."
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
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
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
    mode: 'substring',
    pattern: ''
})

const isEditing = computed(() => editingId.value !== null)

const locationTypeOptions = [
    { label: 'Header', value: 'header' },
    { label: 'Body', value: 'body' }
]

const modeOptions = [
    { label: '子串匹配 (substring)', value: 'substring' },
    { label: '正则匹配 (regex)', value: 'regex' },
    { label: '关键词 (keyword)', value: 'keyword' },
    { label: 'XPath', value: 'xpath' },
    { label: 'JSONPath', value: 'jsonpath' }
]

watch(() => sessionStore.editingFieldId, (id) => {
    if (id !== null) {
        editingId.value = id
        const field = sessionStore.fields.find(f => f.id === id)
        if (field) {
            form.value = {
                name: field.name,
                locationType: field.location?.type || 'header',
                locationName: field.location?.name || '',
                mode: field.mode || 'substring',
                pattern: field.pattern || ''
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
        mode: 'substring',
        pattern: ''
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
    if (!form.value.pattern.trim()) {
        toast.add({ severity: 'warn', summary: '请输入匹配规则', life: 2000 })
        return
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
        enabled: true
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
</style>
