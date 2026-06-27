<template>
    <div
        :class="['pane-resizer', `resizer-${direction}`]"
        @mousedown="onMouseDown"
    ></div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

const props = withDefaults(defineProps<{
    direction: 'horizontal' | 'vertical'
    minRatio?: number
    maxRatio?: number
}>(), {
    minRatio: 10,
    maxRatio: 90
})

const emit = defineEmits<{
    resize: [ratio: number]
}>()

const isDragging = ref(false)
let startPos = 0
let startSizeA = 0
let startSizeB = 0
let onMouseMove: ((e: MouseEvent) => void) | null = null
let onMouseUp: (() => void) | null = null

function onMouseDown(e: MouseEvent) {
    e.preventDefault()
    isDragging.value = true

    const elA = (e.currentTarget as HTMLElement).previousElementSibling as HTMLElement
    const elB = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement
    if (!elA || !elB) return

    if (props.direction === 'horizontal') {
        startPos = e.clientX
        startSizeA = elA.getBoundingClientRect().width
        startSizeB = elB.getBoundingClientRect().width
    } else {
        startPos = e.clientY
        startSizeA = elA.getBoundingClientRect().height
        startSizeB = elB.getBoundingClientRect().height
    }

    document.body.style.userSelect = 'none'

    onMouseMove = (ev: MouseEvent) => {
        if (!isDragging.value) return
        const delta = props.direction === 'horizontal'
            ? ev.clientX - startPos
            : ev.clientY - startPos
        const total = startSizeA + startSizeB
        let ratio = ((startSizeA + delta) / total) * 100
        ratio = Math.max(props.minRatio, Math.min(props.maxRatio, ratio))
        emit('resize', ratio)
    }

    onMouseUp = () => {
        isDragging.value = false
        document.body.style.userSelect = ''
        if (onMouseMove) {
            document.removeEventListener('mousemove', onMouseMove)
            onMouseMove = null
        }
        if (onMouseUp) {
            document.removeEventListener('mouseup', onMouseUp)
            onMouseUp = null
        }
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
}
</script>

<style scoped>
.pane-resizer {
    flex-shrink: 0;
    background: var(--hh-border, #dee2e6);
    transition: background 0.15s;
}

.pane-resizer:hover {
    background: var(--p-primary-color, #0d6efd);
}

.resizer-horizontal {
    width: 4px;
    cursor: col-resize;
}

.resizer-vertical {
    height: 4px;
    cursor: row-resize;
}
</style>
