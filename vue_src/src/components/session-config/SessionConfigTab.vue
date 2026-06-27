<template>
    <div class="session-config-tab h-100 d-flex flex-column overflow-hidden">
        <Tabs v-model:value="activeSubTab" class="flex-grow-1 d-flex flex-column overflow-hidden">
            <TabList>
                <Tab value="0">字段管理</Tab>
                <Tab value="1">方案管理</Tab>
            </TabList>
            <TabPanels class="flex-grow-1 overflow-hidden">
                <TabPanel value="0" class="h-100 p-0">
                    <FieldsManagement class="h-100" />
                </TabPanel>
                <TabPanel value="1" class="h-100 p-0">
                    <SchemesManagement class="h-100" />
                </TabPanel>
            </TabPanels>
        </Tabs>
    </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import FieldsManagement from './FieldsManagement.vue'
import SchemesManagement from './SchemesManagement.vue'

const activeSubTab = ref('0')
</script>

<style scoped>
:deep(.p-tabpanels) {
    flex: 1 1 0;
    overflow: hidden;
}

:deep(.p-tabpanel) {
    height: 100%;
}
</style>
