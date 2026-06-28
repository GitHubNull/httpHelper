<template>
    <Teleport to="body">
        <Transition name="hh-fs">
            <div v-show="visible" class="hh-fullscreen-overlay">
                <div class="hh-fs-header d-flex align-items-center gap-2 px-2 border-bottom flex-shrink-0">
                    <span class="hh-fs-title small fw-bold">{{ title }}</span>
                    <Button
                        class="ms-auto"
                        icon="pi pi-times"
                        @click="close"
                        text
                        rounded
                        size="small"
                        v-tooltip.top="'关闭 (Esc)'"
                    />
                </div>
                <div ref="contentEl" class="hh-fs-body flex-grow-1 overflow-hidden"></div>
            </div>
        </Transition>
    </Teleport>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import Button from 'primevue/button'

const props = defineProps<{ visible: boolean; title?: string }>()
const emit = defineEmits<{ 'update:visible': [boolean] }>()

const contentEl = ref<HTMLElement | null>(null)
defineExpose({ contentEl })

function close() {
    emit('update:visible', false)
}

// 嵌套全屏栈：ESC 仅关闭栈顶遮罩
const stackKey = '__hhFsStack'
const closerStack: Array<() => void> = (window as any)[stackKey] || ((window as any)[stackKey] = [])

function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
        const top = closerStack[closerStack.length - 1]
        if (top) {
            e.stopPropagation()
            top()
        }
    }
}

watch(
    () => props.visible,
    (v) => {
        if (v) {
            closerStack.push(close)
            document.body.style.overflow = 'hidden'
        } else {
            const i = closerStack.indexOf(close)
            if (i >= 0) closerStack.splice(i, 1)
            if (closerStack.length === 0) document.body.style.overflow = ''
        }
    }
)

onMounted(() => document.addEventListener('keydown', onKey, true))
onUnmounted(() => {
    document.removeEventListener('keydown', onKey, true)
    const i = closerStack.indexOf(close)
    if (i >= 0) closerStack.splice(i, 1)
    if (closerStack.length === 0) document.body.style.overflow = ''
})
</script>

<style scoped>
.hh-fs-header {
    height: 30px;
}

.hh-fs-title {
    font-size: 12px;
}

.hh-fs-body {
    min-height: 0;
}
</style>
