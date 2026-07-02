import { defineStore } from 'pinia'
import type { HarEntry, RequestMeta } from '@/types/har'
import { createLogger } from '@/utils/debug-logger'

const logger = createLogger('network')
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
            logger.log('初始化网络监听器, 录制状态:', this.isRecording)
            chrome.devtools.network.onRequestFinished.addListener((request: any) => {
                if (!this.isRecording) {
                    logger.log('录制已暂停，跳过请求:', request.request?.method, request.request?.url)
                    return
                }

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
                        logger.warn('请求列表溢出，已丢弃最旧记录, uid:', dropped._uid, '当前数量:', this.requests.length)
                    }
                }

                logger.log('请求捕获:', request.request?.method, request.request?.url, 'status:', request.response?.status, 'uid:', request._uid, '总数:', this.requests.length)
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
            const count = this.requests.length
            logger.log('清空请求列表, 数量:', count)
            this.requests = []
            this.requestMeta.clear()
            this.uidCounter = 0
        },

        getRequestCount(): number {
            return this.requests.length
        },

        setRecording(enabled: boolean) {
            logger.log('录制状态切换:', enabled ? '开启' : '暂停')
            this.isRecording = enabled
        },

        getRequestMeta(uid?: number): RequestMeta {
            if (!uid) return { color: null, note: '' }
            return this.requestMeta.get(uid) || { color: null, note: '' }
        },

        setRequestColor(uid: number, color: string | null) {
            const meta = this.requestMeta.get(uid)
            if (meta) {
                meta.color = color
                logger.log('设置请求颜色, uid:', uid, 'color:', color)
            }
        },

        setRequestNote(uid: number, note: string) {
            const meta = this.requestMeta.get(uid)
            if (meta) {
                meta.note = note
                logger.log('设置请求备注, uid:', uid, 'note长度:', note.length)
            }
        }
    }
})
