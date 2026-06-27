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
                    <HttpHistoryTab />
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
</style>
