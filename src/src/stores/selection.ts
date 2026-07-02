import { defineStore } from 'pinia'
import type { HarEntry } from '@/types/har'
import {
    buildRawRequestFromEntry, buildPrettyRequestFromEntry, buildHexRequestFromEntry,
    buildRawResponseFromEntry, buildPrettyResponseFromEntry, buildHexResponseFromEntry,
    detectContentType, isBodyBinary
} from '@/utils/content-formatter'
import { useFilterStore } from './filter'

export type LayoutType = 'vertical' | 'horizontal' | 'tabs'
export type TabType = 'raw' | 'pretty' | 'hex'

export const COLOR_LIST = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray'] as const
export const COLOR_MAP: Record<string, string> = {
    red: '#dc3545', orange: '#fd7e14', yellow: '#ffc107', green: '#198754',
    blue: '#0d6efd', purple: '#6f42c1', pink: '#d63384', gray: '#6c757d'
}
export const COLOR_NAMES: Record<string, string> = {
    red: '红色', orange: '橙色', yellow: '黄色', green: '绿色',
    blue: '蓝色', purple: '紫色', pink: '粉色', gray: '灰色'
}

export interface PaneContent {
    raw: string
    pretty: string
    hex: string
}

export const useSelectionStore = defineStore('selection', {
    state: () => ({
        currentRequest: null as HarEntry | null,
        currentResponseBody: '' as string,
        currentLayout: 'vertical' as LayoutType,
        activeTab: {
            request: 'raw' as TabType,
            response: 'raw' as TabType
        },
        activePaneTab: 'request' as 'request' | 'response',
        showAdvancedFilter: false,
        tableRatio: 50,
        paneRatio: 50,
        isLoadingBody: false,
        isRequestBodyBinary: false,
        isResponseBodyBinary: false,
        currentResponseEncoding: '',
        requestContent: { raw: '', pretty: '', hex: '' } as PaneContent,
        responseContent: { raw: '', pretty: '', hex: '' } as PaneContent,
        editingNoteUid: null as number | null,
        noteText: '',
        softWrapEnabled: { request: true, response: true } as { request: boolean; response: boolean },
        showLineBreaks: { request: false, response: false } as { request: boolean; response: boolean }
    }),

    actions: {
        selectRequest(request: HarEntry | null) {
            const filterStore = useFilterStore()
            this.currentRequest = request

            if (request) {
                filterStore.setSelectedUid(request._uid || null)

                this.requestContent = {
                    raw: buildRawRequestFromEntry(request),
                    pretty: buildPrettyRequestFromEntry(request),
                    hex: buildHexRequestFromEntry(request)
                }
                this.isRequestBodyBinary = isBodyBinary(request.request.headers, request.request.postData?.text || '')

                this.responseContent = { raw: '加载中...', pretty: '加载中...', hex: '加载中...' }
                this.isResponseBodyBinary = false
                this.currentResponseEncoding = ''
                this.isLoadingBody = true

                request.getContent((body: string, encoding: string) => {
                    const bodyText = body || ''
                    this.currentResponseBody = bodyText
                    this.currentResponseEncoding = encoding || ''
                    this.responseContent = {
                        raw: buildRawResponseFromEntry(request, bodyText),
                        pretty: buildPrettyResponseFromEntry(request, bodyText),
                        hex: buildHexResponseFromEntry(request, bodyText)
                    }
                    this.isLoadingBody = false
                    this.isResponseBodyBinary = isBodyBinary(request.response.headers, bodyText)

                    // Only switch to pretty/hex when body is non-empty
                    const resType = bodyText ? detectContentType(request.response ? request.response.headers : []) : 'text'
                    if (resType === 'json' || resType === 'xml') this.activeTab.response = 'pretty'
                    else if (resType === 'binary') this.activeTab.response = 'hex'
                    else this.activeTab.response = 'raw'

                    const reqBodyText = request.request.postData?.text || ''
                    const reqType = reqBodyText ? detectContentType(request.request.headers) : 'text'
                    if (reqType === 'json' || reqType === 'xml') this.activeTab.request = 'pretty'
                    else if (reqType === 'binary') this.activeTab.request = 'hex'
                    else this.activeTab.request = 'raw'
                })
            } else {
                filterStore.setSelectedUid(null)
                this.currentResponseBody = ''
                this.currentResponseEncoding = ''
                this.isRequestBodyBinary = false
                this.isResponseBodyBinary = false
                this.requestContent = { raw: '', pretty: '', hex: '' }
                this.responseContent = { raw: '', pretty: '', hex: '' }
            }
        },

        clearSelection() {
            this.currentRequest = null
            this.currentResponseBody = ''
            this.currentResponseEncoding = ''
            this.isRequestBodyBinary = false
            this.isResponseBodyBinary = false
            this.requestContent = { raw: '', pretty: '', hex: '' }
            this.responseContent = { raw: '', pretty: '', hex: '' }
            this.isLoadingBody = false
        },

        setLayout(layout: LayoutType) {
            this.currentLayout = layout
        },

        setActiveTab(pane: 'request' | 'response', tab: TabType) {
            this.activeTab[pane] = tab
        },

        switchPaneTab(pane: 'request' | 'response') {
            this.activePaneTab = pane
        },

        getPaneText(pane: 'request' | 'response', tab: TabType): string {
            const content = pane === 'request' ? this.requestContent : this.responseContent
            if (tab === 'raw') return content.raw
            if (tab === 'pretty') return content.pretty
            if (tab === 'hex') return content.hex
            return ''
        },

        toggleSoftWrap(pane: 'request' | 'response') {
            this.softWrapEnabled[pane] = !this.softWrapEnabled[pane]
        },

        toggleLineBreaks(pane: 'request' | 'response') {
            this.showLineBreaks[pane] = !this.showLineBreaks[pane]
        },

        setNoteEditing(uid: number | null, text: string = '') {
            this.editingNoteUid = uid
            this.noteText = text
        }
    }
})
