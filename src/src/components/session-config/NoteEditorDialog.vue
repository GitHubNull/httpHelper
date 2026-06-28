<template>
    <Dialog
        v-model:visible="visible"
        header="编辑备注"
        :modal="true"
        :style="{ width: '400px' }"
        :closeOnEscape="true"
        :draggable="false"
        @show="onShow"
    >
        <div class="p-2">
            <Textarea
                ref="noteTextareaRef"
                v-model="noteText"
                rows="4"
                class="w-100"
                placeholder="输入备注内容..."
            />
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
                @click="saveNote"
                size="small"
            />
        </template>
    </Dialog>
</template>

<script lang="ts" setup>
import { ref, watch, nextTick } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import { useSelectionStore } from '@/stores/selection'
import { useNetworkStore } from '@/stores/network'
import { useFilterStore } from '@/stores/filter'

const selectionStore = useSelectionStore()
const networkStore = useNetworkStore()
const filterStore = useFilterStore()

const visible = ref(false)
const noteText = ref('')
const noteTextareaRef = ref<{ $el?: HTMLTextAreaElement } | null>(null)

function onShow() {
    nextTick(() => {
        noteTextareaRef.value?.$el?.focus()
    })
}

watch(() => selectionStore.editingNoteUid, (uid) => {
    if (uid !== null) {
        noteText.value = selectionStore.noteText
        visible.value = true
    }
})

watch(visible, (val) => {
    if (!val && selectionStore.editingNoteUid !== null) {
        selectionStore.setNoteEditing(null)
    }
})

function saveNote() {
    if (selectionStore.editingNoteUid !== null) {
        networkStore.setRequestNote(selectionStore.editingNoteUid, noteText.value)
        filterStore.refreshDisplay()
    }
    visible.value = false
}
</script>

<style scoped>
:deep(.p-dialog-content) {
    padding: 0;
}
</style>
