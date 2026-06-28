<template>
    <div class="hex-view h-100 overflow-auto">
        <pre class="hex-display" ref="hexEl">{{ content }}</pre>
    </div>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, nextTick } from 'vue'

const props = defineProps<{
    content: string
}>()

const hexEl = ref<HTMLElement | null>(null)

watch(() => props.content, () => {
    nextTick(() => {
        if (hexEl.value) {
            hexEl.value.textContent = props.content
        }
    })
})

onMounted(() => {
    if (hexEl.value) {
        hexEl.value.textContent = props.content
    }
})
</script>

<style scoped>
.hex-view {
    padding: 2px 4px;
}

.hex-display {
    margin: 0;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 11px;
    line-height: 1.4;
    white-space: pre;
}
</style>
