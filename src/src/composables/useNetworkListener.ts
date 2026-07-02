import { useNetworkStore } from '@/stores/network'
import { useFilterStore } from '@/stores/filter'
import { useSessionStore } from '@/stores/session'
import { useToast } from 'primevue/usetoast'
import { copyText } from '@/utils/clipboard-utils'
import { formatExtractResult } from '@/services/session-extractor'
import type { HarEntry } from '@/types/har'
import { createLogger } from '@/utils/debug-logger'

const logger = createLogger('listener')

export function useNetworkListener() {
    const networkStore = useNetworkStore()
    const filterStore = useFilterStore()
    const sessionStore = useSessionStore()
    const toast = useToast()

    let initialized = false

    function init() {
        if (initialized) return
        initialized = true
        logger.log('初始化网络监听器组合式函数')

        networkStore.initNetworkListener(async (request: HarEntry) => {
            logger.log('收到网络请求回调:', request.request?.method, request.request?.url)
            filterStore.refreshDisplay()

            const result = await sessionStore.checkSessionExtraction(request)
            if (result && sessionStore.activeScheme) {
                const formatted = formatExtractResult(result.data, sessionStore.activeScheme)
                const copied = await copyText(formatted)
                toast.add({
                    severity: 'info',
                    summary: copied ? '会话已提取并复制' : '会话已提取',
                    detail: result.keys.join(', '),
                    life: 3000
                })
            }
        })
    }

    return { init }
}
