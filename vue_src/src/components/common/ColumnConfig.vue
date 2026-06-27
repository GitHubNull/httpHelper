<template>
    <Popover ref="popover">
        <div class="col-config-list" @click.stop>
            <div
                v-for="col in columns"
                :key="col.field"
                class="col-config-item"
            >
                <Checkbox
                    v-model="col.visible"
                    :value="col.field"
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
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import Popover from 'primevue/popover'
import Checkbox from 'primevue/checkbox'

interface ColumnConfig {
    field: string
    header: string
    visible: boolean
    mandatory?: boolean
}

const popover = ref()
const columns = ref<ColumnConfig[]>([
    { field: 'index', header: '#', visible: true, mandatory: true },
    { field: 'color', header: '标签', visible: true, mandatory: true },
    { field: 'method', header: '方法', visible: true },
    { field: 'host', header: '主机', visible: true },
    { field: 'url', header: '路径', visible: true },
    { field: 'status', header: '状态', visible: true },
    { field: 'type', header: '类型', visible: true },
    { field: 'length', header: '长度', visible: true },
    { field: 'reqtime', header: '请求时间', visible: true },
    { field: 'restime', header: '响应时间', visible: true },
    { field: 'time', header: '耗时', visible: true },
    { field: 'note', header: '备注', visible: true }
])

function open(event: Event) {
    popover.value.show(event)
}

function isColumnVisible(field: string): boolean {
    const col = columns.value.find(c => c.field === field)
    return col ? col.visible : true
}

defineExpose({ open, isColumnVisible, columns })
</script>

<style scoped>
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
</style>
