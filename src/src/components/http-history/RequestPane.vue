<template>
    <div id="request-pane" class="pane-container d-flex flex-column overflow-hidden">
        <Teleport :to="target" :disabled="!isFullscreen">
            <div class="pane-inner h-100 d-flex flex-column overflow-hidden">
                <div class="pane-header d-flex align-items-center gap-1 px-1 py-0 border-bottom flex-shrink-0">
                    <span class="pane-title fw-bold small">请求</span>
                    <div class="pane-tabs d-flex gap-0">
                        <Button
                            v-for="tab in tabs"
                            :key="tab"
                            :label="tabLabel(tab)"
                            @click="selectionStore.setActiveTab('request', tab)"
                            :class="['tab-btn', { 'tab-active': selectionStore.activeTab.request === tab }]"
                            text
                            size="small"
                        />
                    </div>
                    <div class="ms-auto d-flex gap-1">
                        <Button
                            icon="pi pi-copy"
                            @click="copyContent"
                            text
                            size="small"
                            :disabled="isBodyBinary"
                            v-tooltip.top="isBodyBinary ? '因为报文体是二进制数据，无法复制' : '复制全部'"
                        />
                        <Button
                            icon="pi pi-download"
                            @click="downloadContent"
                            text
                            size="small"
                            :disabled="isBodyBinary"
                            v-tooltip.top="isBodyBinary ? '因为报文体是二进制数据，无法下载' : '下载'"
                        />
                        <Button
                            icon="pi pi-key"
                            @click="copySession"
                            text
                            size="small"
                            v-tooltip.top="'复制会话'"
                        />
                        <Button
                            icon="pi pi-bars"
                            @click="toggleCopyMenu"
                            text
                            size="small"
                            v-tooltip.top="'更多操作'"
                            aria-haspopup="true"
                            aria-controls="req-copy-menu"
                        />
                        <Menu ref="copyMenu" :model="copyMenuItems" popup />
                        <div class="header-separator"></div>
                        <Button
                            :icon="selectionStore.softWrapEnabled.request ? 'pi pi-arrows-h' : 'pi pi-arrow-right'"
                            @click="selectionStore.toggleSoftWrap('request')"
                            text
                            size="small"
                            :class="['toggle-btn', { 'wrap-toggle-active': selectionStore.softWrapEnabled.request }]"
                            v-tooltip.top="selectionStore.softWrapEnabled.request ? '软换行：开' : '软换行：关'"
                        />
                        <Button
                            :class="['toggle-btn', { 'wrap-toggle-active': selectionStore.showLineBreaks.request }]"
                            @click="selectionStore.toggleLineBreaks('request')"
                            text
                            size="small"
                            label="NL"
                            v-tooltip.top="selectionStore.showLineBreaks.request ? '换行符：显示' : '换行符：隐藏'"
                        />
                        <Button
                            :icon="isFullscreen ? 'pi pi-window-minimize' : 'pi pi-window-maximize'"
                            @click="toggle"
                            text
                            size="small"
                            v-tooltip.top="isFullscreen ? '退出全屏' : '全屏显示'"
                        />
                    </div>
                </div>
                <div class="pane-content flex-grow-1 overflow-hidden position-relative">
                    <RawView
                        v-if="selectionStore.activeTab.request === 'raw'"
                        :content="selectionStore.requestContent.raw"
                        :softWrap="selectionStore.softWrapEnabled.request"
                        :showLineBreaks="selectionStore.showLineBreaks.request"
                    />
                    <PrettyView
                        v-else-if="selectionStore.activeTab.request === 'pretty'"
                        :content="selectionStore.requestContent.pretty"
                        :language="prettyLanguage"
                        :softWrap="selectionStore.softWrapEnabled.request"
                        :showLineBreaks="selectionStore.showLineBreaks.request"
                    />
                    <HexView
                        v-else-if="selectionStore.activeTab.request === 'hex'"
                        :content="selectionStore.requestContent.hex"
                        :showLineBreaks="selectionStore.showLineBreaks.request"
                    />
                </div>
                <SearchBar pane="req" />
            </div>
        </Teleport>
        <FullscreenOverlay v-model:visible="isFullscreen" title="请求" ref="overlayRef" />
    </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import RawView from './RawView.vue'
import PrettyView from './PrettyView.vue'
import HexView from './HexView.vue'
import SearchBar from './SearchBar.vue'
import FullscreenOverlay from '../common/FullscreenOverlay.vue'
import { useFullscreenOverlay } from '@/composables/useFullscreenOverlay'
import { useSelectionStore } from '@/stores/selection'
import { useSessionStore } from '@/stores/session'
import { useToast } from 'primevue/usetoast'
import { copyText, downloadText, downloadBinary } from '@/utils/clipboard-utils'
import { detectContentType } from '@/utils/string-utils'
import { buildRawRequest, bodyToBytes, buildBinaryMessage } from '@/utils/content-formatter'

const selectionStore = useSelectionStore()
const { isFullscreen, overlayRef, target, toggle } = useFullscreenOverlay()
const sessionStore = useSessionStore()
const toast = useToast()
const copyMenu = ref()

const tabs: Array<'raw' | 'pretty' | 'hex'> = ['raw', 'pretty', 'hex']

function tabLabel(tab: string): string {
    return { raw: 'Raw', pretty: 'Pretty', hex: 'Hex' }[tab] || tab
}

const prettyLanguage = computed(() => {
    if (!selectionStore.currentRequest) return ''
    const ct = detectContentType(selectionStore.currentRequest.request.headers)
    if (ct === 'json') return 'json'
    if (ct === 'xml') return 'xml'
    return ''
})

const isBodyBinary = computed(() => selectionStore.isRequestBodyBinary)

const copyMenuItems = computed(() => {
    if (isBodyBinary.value) {
        return [
            {
                label: '复制请求头',
                icon: 'pi pi-copy',
                command: () => copyHeaders()
            },
            {
                label: '复制请求体（二进制，不可用）',
                icon: 'pi pi-copy',
                disabled: true
            },
            { separator: true },
            {
                label: '下载请求头',
                icon: 'pi pi-download',
                command: () => downloadHeaders()
            },
            {
                label: '下载二进制请求体',
                icon: 'pi pi-download',
                command: () => downloadBinaryBody()
            },
            {
                label: '下载二进制完整请求报文',
                icon: 'pi pi-download',
                command: () => downloadBinaryMessage()
            }
        ]
    }
    return [
        {
            label: '复制请求头',
            icon: 'pi pi-copy',
            command: () => copyHeaders()
        },
        {
            label: '复制请求体',
            icon: 'pi pi-copy',
            command: () => copyBody()
        }
    ]
})

function toggleCopyMenu(event: Event) {
    copyMenu.value.toggle(event)
}

function copyHeaders() {
    if (!selectionStore.currentRequest) return
    const raw = buildRawRequest(selectionStore.currentRequest.request)
    const headers = raw.split('\r\n\r\n')[0]
    copyText(headers).then(ok => {
        toast.add({ severity: 'success', summary: ok ? '请求头已复制' : '复制失败', life: 2000 })
    })
}

function copyBody() {
    if (!selectionStore.currentRequest) return
    const body = selectionStore.currentRequest.request.postData?.text || ''
    copyText(body).then(ok => {
        toast.add({ severity: 'success', summary: body ? (ok ? '请求体已复制' : '复制失败') : '无主体内容', life: 2000 })
    })
}

function downloadHeaders() {
    if (!selectionStore.currentRequest) return
    const raw = buildRawRequest(selectionStore.currentRequest.request)
    const headers = raw.split('\r\n\r\n')[0]
    downloadText(headers, 'request_headers.txt')
}

function downloadBinaryBody() {
    if (!selectionStore.currentRequest) return
    const body = selectionStore.currentRequest.request.postData?.text || ''
    const bytes = bodyToBytes(body, '')
    downloadBinary(bytes, 'request_body.bin')
}

function downloadBinaryMessage() {
    if (!selectionStore.currentRequest) return
    const body = selectionStore.currentRequest.request.postData?.text || ''
    const headerText = buildRawRequest(selectionStore.currentRequest.request).split('\r\n\r\n')[0] + '\r\n\r\n'
    const bytes = buildBinaryMessage(headerText, body, '')
    downloadBinary(bytes, 'request_full.bin')
}

function copyContent() {
    const text = selectionStore.getPaneText('request', selectionStore.activeTab.request)
    copyText(text).then(ok => {
        toast.add({ severity: 'success', summary: ok ? '请求已复制' : '复制失败', life: 2000 })
    })
}

function downloadContent() {
    const text = selectionStore.getPaneText('request', selectionStore.activeTab.request)
    const req = selectionStore.currentRequest
    const name = req ? 'request_' + (req.request.method || 'HTTP') + '.txt' : 'request.txt'
    downloadText(text, name)
}

function copySession() {
    if (!selectionStore.currentRequest) return
    const result = sessionStore.checkSessionExtraction(selectionStore.currentRequest)
    if (result && result.keys.length > 0) {
        const text = JSON.stringify(result.data, null, 2)
        copyText(text).then(ok => {
            toast.add({ severity: 'success', summary: ok ? `会话已复制：${result.keys.join(', ')}` : '复制失败', life: 3000 })
        })
    } else {
        toast.add({ severity: 'info', summary: '无匹配的会话方案或未提取到会话信息', life: 3000 })
    }
}
</script>

<style scoped>
.pane-container {
    min-height: 0;
}

.pane-inner {
    min-width: 0;
    min-height: 0;
}

.pane-header {
    height: 26px;
}

.pane-title {
    font-size: 11px;
    white-space: nowrap;
}

.pane-tabs {
    margin-left: 4px;
}

.tab-btn {
    min-width: 40px;
    height: 20px;
    padding: 0 4px;
    font-size: 10px;
    border: 1px solid transparent;
    color: var(--hh-text, #212529) !important;
}

.tab-btn.tab-active {
    border: 1px solid var(--hh-primary, #0d6efd);
    color: var(--hh-primary, #0d6efd) !important;
    background: rgba(13, 110, 253, 0.1);
}

.header-separator {
    width: 1px;
    height: 16px;
    background: var(--hh-border, #dee2e6);
    margin: 0 2px;
    align-self: center;
}

.toggle-btn {
    min-width: 24px;
    height: 20px;
    padding: 0 2px;
}

.pane-content {
    min-height: 0;
}
</style>
