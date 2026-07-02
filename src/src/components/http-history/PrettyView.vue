<template>
    <div class="pretty-view h-100 overflow-auto" ref="scrollContainer" @keydown="onKeydown" tabindex="0">
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
                    data-is-html="true"
                    v-html="line"
                ></div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, computed } from 'vue'
import hljs from 'highlight.js/lib/core'
import {
    copyLineContent,
    handleLineCopyShortcut,
} from '@/composables/useLineCopy'
import { useToast } from 'primevue/usetoast'

const props = withDefaults(defineProps<{
    content: string
    language?: string
    softWrap?: boolean
    showLineBreaks?: boolean
}>(), {
    softWrap: true,
    showLineBreaks: false
})

const scrollContainer = ref<HTMLElement | null>(null)
const hoverLineIndex = ref(-1)
const toast = useToast()

// 规范化文本
function getNormalizedText(): string {
    return (props.content || '').replace(/\r\n/g, '\n').replace(/^\n+/, '')
}

// 逐行 HTML（含高亮和换行符标记）
const renderedLines = computed<string[]>(() => {
    const raw = props.content || ''
    const text = raw.replace(/\r\n/g, '\n').replace(/^\n+/, '')

    if (props.language && hljs.getLanguage(props.language)) {
        try {
            const result = hljs.highlight(text, { language: props.language })
            let html = result.value
            if (props.showLineBreaks) {
                html = html.split('\n').map(line =>
                    line + '<span class="line-break-marker">↵</span>'
                ).join('\n')
            }
            return html.split('\n')
        } catch {
            // fall through
        }
    }

    if (props.showLineBreaks) {
        return text.split('\n').map(line =>
            escapeHtml(line) + '<span class="line-break-marker">↵</span>'
        )
    }
    return text.split('\n').map(line => escapeHtml(line))
})

// 获取纯文本行（用于复制）
function getLineText(index: number): string {
    const normalized = getNormalizedText()
    const lines = normalized.split('\n')
    if (index < 0 || index >= lines.length) return ''
    return lines[index]
}

function onLineNumClick(index: number) {
    const text = getLineText(index)
    copyLineContent(text, index).then(r => {
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
        const text = getLineText(idx)
        copyLineContent(text, idx).then(r => {
            toast.add({
                severity: r.ok ? 'success' : 'error',
                summary: r.ok ? `第 ${r.lineIdx + 1} 行已复制` : '复制失败',
                life: 2000
            })
        })
    })
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

onMounted(() => {
    // initial render happens via computed
})
</script>

<style scoped>
.pretty-view {
    position: relative;
    min-height: 0;
}
</style>
