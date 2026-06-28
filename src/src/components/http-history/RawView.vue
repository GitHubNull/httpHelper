<template>
    <div class="raw-view h-100 d-flex overflow-hidden">
        <div class="line-numbers" ref="lineNumbersEl"></div>
        <div class="textarea-wrapper position-relative flex-grow-1 overflow-hidden">
            <textarea
                ref="textareaEl"
                class="code-view"
                :value="content"
                readonly
                spellcheck="false"
                @scroll="onScroll"
            ></textarea>
            <div class="highlight-overlay" ref="overlayEl"></div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import { updateLineNumbers } from '@/utils/dom-utils'

const props = defineProps<{
    content: string
}>()

const textareaEl = ref<HTMLTextAreaElement | null>(null)
const lineNumbersEl = ref<HTMLElement | null>(null)
const overlayEl = ref<HTMLDivElement | null>(null)

function onScroll() {
    if (textareaEl.value && lineNumbersEl.value) {
        updateLineNumbers(textareaEl.value, lineNumbersEl.value, props.content)
    }
    if (overlayEl.value && textareaEl.value) {
        overlayEl.value.scrollTop = textareaEl.value.scrollTop
        overlayEl.value.scrollLeft = textareaEl.value.scrollLeft
    }
}

function syncLineNumbers() {
    if (textareaEl.value && lineNumbersEl.value) {
        updateLineNumbers(textareaEl.value, lineNumbersEl.value, props.content)
    }
}

watch(() => props.content, () => {
    nextTick(() => {
        syncLineNumbers()
    })
}, { immediate: true })

onMounted(() => {
    syncLineNumbers()
})

defineExpose({ textareaEl, overlayEl })
</script>

<style scoped>
.raw-view {
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

.code-view {
    flex: 1;
    border: none;
    outline: none;
    resize: none;
    padding: 2px 4px;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 11px;
    line-height: 1.4;
    white-space: pre;
    overflow: auto;
    background: transparent;
    color: inherit;
}
</style>
