import { useNetworkStore } from '@/stores/network'
import { useFilterStore } from '@/stores/filter'
import { useSessionStore } from '@/stores/session'
import { useToast } from 'primevue/usetoast'
import type { HarEntry } from '@/types/har'

export function useNetworkListener() {
    const networkStore = useNetworkStore()
    const filterStore = useFilterStore()
    const sessionStore = useSessionStore()
    const toast = useToast()

    let initialized = false

    function init() {
        if (initialized) return
        initialized = true

        networkStore.initNetworkListener((request: HarEntry) => {
            filterStore.refreshDisplay()

            const result = sessionStore.checkSessionExtraction(request)
            if (result) {
                toast.add({
                    severity: 'info',
                    summary: '会话已提取',
                    detail: result.keys.join(', '),
                    life: 3000
                })
            }
        })
    }

    return { init }
}
