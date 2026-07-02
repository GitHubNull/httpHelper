<template>
    <div class="raw-view h-100 overflow-auto" ref="scrollContainer" @keydown="onKeydown" tabindex="0">
        <div class="code-table">
            <div
                v-for="(line, i) in renderedLines"
                :key="i"
                class="code-row"
            >
                <div
                    class="line-num-cell"
                    @mouseenter="hoverLineIndex = i"
                    @mouseleave="hoverLineIndex = -1"
                    @click="onLineNumClick(i)"
                >
                    <div class="line-hover-overlay" v-if="hoverLineIndex === i"></div>
                    <span class="line-copy-icon" v-if="hoverLineIndex === i">
                        <i class="pi pi-copy"></i>
                    </span>
                    {{ i + 1 }}
                </div>
                <div
                    class="line-content-cell"
                    :class="{ 'line-nowrap': !softWrap }"
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
    softWrap?: boolean
    showLineBreaks?: boolean
}>(), {
    softWrap: true,
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

function onLineNumClick(index: number) {
    const text = renderedLines.value[index] || ''
    const cleanText = text.replace(/\u21B5$/g, '')
    copyLineContent(cleanText, index).then(r => {
        toast.add({
            severity: r.ok ? 'success' : 'error',
            summary: r.ok ? `第 ${r.lineIdx + 1} 行已复制` : '复制失败',
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
                summary: r.ok ? `第 ${r.lineIdx + 1} 行已复制` : '复制失败',
                life: 2000
            })
        })
    })
}

defineExpose({ scrollContainer })
</script>

<style scoped>
.raw-view {
    position: relative;
    min-height: 0;
}
</style>
