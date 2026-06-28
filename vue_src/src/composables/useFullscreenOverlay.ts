import { ref, computed } from 'vue'
import type FullscreenOverlay from '@/components/common/FullscreenOverlay.vue'

/**
 * 全屏遮罩状态管理 composable
 * 统一管理：全屏状态、遮罩实例引用、Teleport 目标、切换函数
 */
export function useFullscreenOverlay() {
    const isFullscreen = ref(false)
    const overlayRef = ref<InstanceType<typeof FullscreenOverlay> | null>(null)

    const target = computed(() => overlayRef.value?.contentEl ?? null)

    function toggle() {
        isFullscreen.value = !isFullscreen.value
    }

    return { isFullscreen, overlayRef, target, toggle }
}
