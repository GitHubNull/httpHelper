import { defineStore } from 'pinia'
import type { HarEntry, RequestMeta } from '@/types/har'

const MAX_REQUESTS = 500

export const useNetworkStore = defineStore('network', {
    state: () => ({
        requests: [] as HarEntry[],
        isRecording: true,
        uidCounter: 0,
        requestMeta: new Map<number, RequestMeta>(),
        onNewRequestCallback: null as ((request: HarEntry) => void) | null
    }),

    actions: {
        initNetworkListener(callback?: (request: HarEntry) => void) {
            this.onNewRequestCallback = callback || null
            chrome.devtools.network.onRequestFinished.addListener((request: any) => {
                if (!this.isRecording) return

                request._uid = ++this.uidCounter
                this.requestMeta.set(request._uid, { color: null, note: '' })

                request._reqStartTime = request.startedDateTime || null
                if (request.startedDateTime && typeof request.time === 'number') {
                    const startTime = new Date(request.startedDateTime).getTime()
                    request._resEndTime = new Date(startTime + request.time).toISOString()
                } else {
                    request._resEndTime = null
                }

                this.requests.unshift(request)
                if (this.requests.length > MAX_REQUESTS) {
                    const dropped = this.requests.pop()
                    if (dropped && dropped._uid) {
                        this.requestMeta.delete(dropped._uid)
                    }
                }

                this.onNewRequestCallback?.(request)
            })
        },

        getRequests(): HarEntry[] {
            return this.requests
        },

        getRequest(index: number): HarEntry | null {
            return this.requests[index] || null
        },

        getRequestByUid(uid: number): HarEntry | null {
            return this.requests.find(r => r._uid === uid) || null
        },

        clearRequests() {
            this.requests = []
            this.requestMeta.clear()
            this.uidCounter = 0
        },

        getRequestCount(): number {
            return this.requests.length
        },

        setRecording(enabled: boolean) {
            this.isRecording = enabled
        },

        getRequestMeta(uid?: number): RequestMeta {
            if (!uid) return { color: null, note: '' }
            return this.requestMeta.get(uid) || { color: null, note: '' }
        },

        setRequestColor(uid: number, color: string | null) {
            const meta = this.requestMeta.get(uid)
            if (meta) meta.color = color
        },

        setRequestNote(uid: number, note: string) {
            const meta = this.requestMeta.get(uid)
            if (meta) meta.note = note
        }
    }
})
