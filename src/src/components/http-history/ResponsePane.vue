<template>
    <div id="response-pane" class="pane-container d-flex flex-column overflow-hidden">
        <Teleport :to="target" :disabled="!isFullscreen">
            <div class="pane-inner h-100 d-flex flex-column overflow-hidden">
                <div class="pane-header d-flex align-items-center gap-1 px-1 py-0 border-bottom flex-shrink-0">
                    <span class="pane-title fw-bold small">响应</span>
                    <div class="pane-tabs d-flex gap-0">
                        <Button
                            v-for="tab in tabs"
                            :key="tab"
                            :label="tabLabel(tab)"
                            @click="selectionStore.setActiveTab('response', tab)"
                            :class="['tab-btn', { 'tab-active': selectionStore.activeTab.response === tab }]"
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
                            v-tooltip.top="'复制全部'"
                        />
                        <Button
                            icon="pi pi-download"
                            @click="downloadContent"
                            text
                            size="small"
                            v-tooltip.top="'下载'"
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
                            aria-controls="res-copy-menu"
                        />
                        <Menu ref="copyMenu" :model="copyMenuItems" popup />
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
                    <div v-if="selectionStore.isLoadingBody" class="loading-overlay d-flex align-items-center justify-content-center">
                        <span class="text-muted small">加载中...</span>
                    </div>
                    <RawView
                        v-if="selectionStore.activeTab.response === 'raw'"
                        :content="selectionStore.responseContent.raw"
                    />
                    <PrettyView
                        v-else-if="selectionStore.activeTab.response === 'pretty'"
                        :content="selectionStore.responseContent.pretty"
                        :language="prettyLanguage"
                    />
                    <HexView
                        v-else-if="selectionStore.activeTab.response === 'hex'"
                        :content="selectionStore.responseContent.hex"
                    />
                </div>
                <SearchBar pane="res" />
            </div>
        </Teleport>
        <FullscreenOverlay v-model:visible="isFullscreen" title="响应" ref="overlayRef" />
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
import { copyText, downloadText } from '@/utils/clipboard-utils'
import { detectContentType } from '@/utils/string-utils'
import { buildRawResponse } from '@/utils/content-formatter'

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
    const ct = detectContentType(selectionStore.currentRequest.response.headers)
    if (ct === 'json') return 'json'
    if (ct === 'xml') return 'xml'
    return ''
})

const copyMenuItems = [
    {
        label: '复制响应头',
        icon: 'pi pi-copy',
        command: () => copyHeaders()
    },
    {
        label: '复制响应体',
        icon: 'pi pi-copy',
        command: () => copyBody()
    }
]

function toggleCopyMenu(event: Event) {
    copyMenu.value.toggle(event)
}

function copyHeaders() {
    if (!selectionStore.currentRequest) return
    const raw = buildRawResponse(selectionStore.currentRequest.response, selectionStore.currentResponseBody)
    const headers = raw.split('\r\n\r\n')[0]
    copyText(headers).then(ok => {
        toast.add({ severity: 'success', summary: ok ? '响应头已复制' : '复制失败', life: 2000 })
    })
}

function copyBody() {
    const body = selectionStore.currentResponseBody || ''
    copyText(body).then(ok => {
        toast.add({ severity: 'success', summary: body ? (ok ? '响应体已复制' : '复制失败') : '无主体内容', life: 2000 })
    })
}

function copyContent() {
    const text = selectionStore.getPaneText('response', selectionStore.activeTab.response)
    copyText(text).then(ok => {
        toast.add({ severity: 'success', summary: ok ? '响应已复制' : '复制失败', life: 2000 })
    })
}

function downloadContent() {
    const text = selectionStore.getPaneText('response', selectionStore.activeTab.response)
    const req = selectionStore.currentRequest
    const name = req ? 'response_' + (req.response ? req.response.status : 'HTTP') + '.txt' : 'response.txt'
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

.pane-content {
    min-height: 0;
}

.loading-overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
    background: rgba(255, 255, 255, 0.5);
}
</style>
