<template>
    <div class="app-container d-flex flex-column vh-100 overflow-hidden">
        <ToolbarBar />
        <Tabs v-model:value="activeTab" class="flex-grow-1 d-flex flex-column overflow-hidden">
            <TabList>
                <Tab value="0">HTTP 历史</Tab>
                <Tab value="1">会话复制配置</Tab>
            </TabList>
            <TabPanels class="flex-grow-1 overflow-hidden">
                <TabPanel value="0" class="h-100 p-0">
                    <div class="position-relative h-100">
                        <Button
                            v-if="activeTab === '0' && !isFs0"
                            class="fs-trigger-float"
                            icon="pi pi-window-maximize"
                            @click="isFs0 = true"
                            text
                            rounded
                            size="small"
                            v-tooltip.top="'HTTP 历史全屏'"
                        />
                        <Teleport :to="target0" :disabled="!isFs0">
                            <HttpHistoryTab class="h-100" />
                        </Teleport>
                        <FullscreenOverlay v-model:visible="isFs0" title="HTTP 历史" ref="overlay0" />
                    </div>
                </TabPanel>
                <TabPanel value="1" class="h-100 p-0">
                    <SessionConfigTab />
                </TabPanel>
            </TabPanels>
        </Tabs>
        <Toast />
        <FieldEditorDialog />
        <SchemeEditorDialog />
        <NoteEditorDialog />
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import ToolbarBar from '@/components/toolbar/ToolbarBar.vue'
import HttpHistoryTab from '@/components/http-history/HttpHistoryTab.vue'
import SessionConfigTab from '@/components/session-config/SessionConfigTab.vue'
import FieldEditorDialog from '@/components/session-config/FieldEditorDialog.vue'
import SchemeEditorDialog from '@/components/session-config/SchemeEditorDialog.vue'
import NoteEditorDialog from '@/components/session-config/NoteEditorDialog.vue'
import FullscreenOverlay from '@/components/common/FullscreenOverlay.vue'
import { useFullscreenOverlay } from '@/composables/useFullscreenOverlay'
import Button from 'primevue/button'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Toast from 'primevue/toast'
import { useNetworkListener } from '@/composables/useNetworkListener'
import { useSessionStore } from '@/stores/session'
import { useFilterStore } from '@/stores/filter'

const activeTab = ref('0')
const { init } = useNetworkListener()
const sessionStore = useSessionStore()
const filterStore = useFilterStore()

const { isFullscreen: isFs0, overlayRef: overlay0, target: target0 } = useFullscreenOverlay()

onMounted(() => {
    init()
    filterStore.refreshDisplay()
    sessionStore.loadAll()
})
</script>

<style scoped>
.app-container {
    font-size: 12px;
}

:deep(.p-tabpanels) {
    flex: 1 1 0;
    overflow: hidden;
}

:deep(.p-tabpanel) {
    height: 100%;
}

.fs-trigger-float {
    position: absolute;
    top: 2px;
    right: 4px;
    z-index: 20;
}
</style>
