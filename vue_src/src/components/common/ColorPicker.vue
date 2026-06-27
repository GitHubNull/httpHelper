<template>
    <Popover ref="popover">
        <div class="color-picker-grid" @click.stop>
            <span
                v-for="color in COLOR_LIST"
                :key="color"
                class="swatch"
                :style="{ background: COLOR_MAP[color] }"
                @click="selectColor(color)"
                :title="COLOR_NAMES[color]"
            ></span>
            <span class="swatch swatch-clear" @click="selectColor(null)" title="清除标签">&times;</span>
        </div>
    </Popover>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import Popover from 'primevue/popover'
import { useNetworkStore } from '@/stores/network'
import { useFilterStore } from '@/stores/filter'
import { COLOR_LIST, COLOR_MAP, COLOR_NAMES } from '@/stores/selection'

const networkStore = useNetworkStore()
const filterStore = useFilterStore()
const popover = ref()
let currentUid = 0

function open(event: Event, uid: number) {
    currentUid = uid
    popover.value.show(event)
}

function selectColor(color: string | null) {
    networkStore.setRequestColor(currentUid, color)
    filterStore.refreshDisplay()
    popover.value.hide()
}

defineExpose({ open })
</script>

<style scoped>
.color-picker-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
    padding: 4px;
}

.swatch {
    display: inline-block;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.2);
    cursor: pointer;
}

.swatch:hover {
    transform: scale(1.15);
}

.swatch-clear {
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    font-size: 14px;
    color: #dc3545;
}
</style>
