<template>
    <div class="pretty-view h-100 d-flex overflow-hidden">
        <div class="line-numbers" ref="lineNumbersEl"></div>
        <pre class="code-block flex-grow-1 overflow-auto m-0" ref="preEl" @scroll="syncLineNumbers"><code ref="codeEl" :class="languageClass"></code></pre>
    </div>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, nextTick, computed } from 'vue'
import hljs from 'highlight.js/lib/core'

const props = defineProps<{
    content: string
    language?: string
}>()

const codeEl = ref<HTMLElement | null>(null)
const lineNumbersEl = ref<HTMLElement | null>(null)
const preEl = ref<HTMLPreElement | null>(null)

const languageClass = computed(() => {
    if (!props.language) return ''
    return `language-${props.language}`
})

function syncLineNumbers() {
    if (!lineNumbersEl.value || !preEl.value) return
    const text = (props.content || '').replace(/\r\n/g, '\n').replace(/^\n+/, '')
    const lines = text.split('\n').length
    let html = ''
    for (let i = 1; i <= lines; i++) {
        html += i + '\n'
    }
    lineNumbersEl.value.textContent = html
    lineNumbersEl.value.scrollTop = preEl.value.scrollTop
}

function highlight() {
    if (!codeEl.value) return
    const raw = props.content || ''
    // 规范化换行符：\r\n → \n，并去除首行空白
    const text = raw.replace(/\r\n/g, '\n').replace(/^\n+/, '')
    if (props.language && hljs.getLanguage(props.language)) {
        try {
            const result = hljs.highlight(text, { language: props.language })
            codeEl.value.innerHTML = result.value
            nextTick(syncLineNumbers)
            return
        } catch {
            // fall through
        }
    }
    codeEl.value.textContent = text
    nextTick(syncLineNumbers)
}

watch(() => props.content, () => {
    nextTick(highlight)
})

watch(() => props.language, () => {
    nextTick(highlight)
})

onMounted(() => {
    highlight()
})
</script>

<style scoped>
.pretty-view {
    position: relative;
}

.line-numbers {
    flex-shrink: 0;
    width: 40px;
    overflow: hidden;
    text-align: right;
    padding: 2px 4px 2px 2px;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 11px;
    line-height: 1.4;
    color: var(--hh-text-muted, #6c757d);
    background: var(--hh-bg-secondary, #f8f9fa);
    border-right: 1px solid var(--hh-border, #dee2e6);
    white-space: pre;
    user-select: none;
}

.code-block {
    margin: 0;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 11px;
    line-height: 1.4;
    white-space: pre-wrap;
    word-break: break-all;
    padding: 2px 4px;
}

.code-block code {
    font-family: inherit;
}
</style>
