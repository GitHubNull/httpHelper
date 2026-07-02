<template>
    <div class="hex-view h-100 overflow-auto" ref="scrollContainer" @keydown="onKeydown" tabindex="0">
        <div class="code-table">
            <div
                v-for="(line, i) in renderedLines"
                :key="i"
                class="code-row"
            >
                <div
                    class="line-num-cell hex-ln"
                    @mouseenter="hoverLineIndex = i"
                    @mouseleave="hoverLineIndex = -1"
                    @click="onLineNumClick(i)"
                >
                    <div class="line-hover-overlay" v-if="hoverLineIndex === i"></div>
                    <span class="line-copy-icon" v-if="hoverLineIndex === i">
                        <i class="pi pi-copy"></i>
                    </span>
                    {{ lineOffsets[i] }}
                </div>
                <div
                    class="line-content-cell"
                    :data-original="line"
                    v-text="line"
                ></div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import {
    copyLineContent,
    handleLineCopyShortcut,
} from '@/composables/useLineCopy'
import { useToast } from 'primevue/usetoast'

const props = withDefaults(defineProps<{
    content: string
    showLineBreaks?: boolean
}>(), {
    showLineBreaks: false
})

const scrollContainer = ref<HTMLElement | null>(null)
const hoverLineIndex = ref(-1)
const toast = useToast()

const renderedLines = computed<string[]>(() => {
    if (!props.content) return ['']
    const lines = props.content.split('\n')
    if (props.showLineBreaks) {
        return lines.map(line => line + '\u21B5')
    }
    return lines
})

const lineOffsets = computed<string[]>(() => {
    const count = renderedLines.value.length
    const offsets: string[] = []
    for (let i = 0; i < count; i++) {
        const offset = (i * 16).toString(16).toUpperCase().padStart(4, '0')
        offsets.push(offset)
    }
    return offsets
})

function onLineNumClick(index: number) {
    const text = renderedLines.value[index] || ''
    // strip line break marker for copy
    const cleanText = text.replace(/\u21B5$/g, '')
    copyLineContent(cleanText, index).then(r => {
        toast.add({
            severity: r.ok ? 'success' : 'error',
            summary: r.ok ? `偏移 ${lineOffsets.value[index]} 已复制` : '复制失败',
            life: 2000
        })
    })
}

function onKeydown(e: KeyboardEvent) {
    handleLineCopyShortcut(e, () => {
        const idx = hoverLineIndex.value
        if (idx < 0) return
        const text = renderedLines.value[idx] || ''
        const cleanText = text.replace(/\u21B5$/g, '')
        copyLineContent(cleanText, idx).then(r => {
            toast.add({
                severity: r.ok ? 'success' : 'error',
                summary: r.ok ? `偏移 ${lineOffsets.value[idx]} 已复制` : '复制失败',
                life: 2000
            })
        })
    })
}

defineExpose({ scrollContainer })
</script>

<style scoped>
.hex-view {
    position: relative;
    min-height: 0;
}
</style>
