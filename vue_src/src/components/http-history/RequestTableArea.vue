<template>
    <div class="request-table-area h-100 d-flex flex-column overflow-hidden">
        <FilterBar />
        <div class="flex-grow-1 overflow-hidden table-scroll-container">
            <RequestTable />
        </div>
    </div>
</template>

<script lang="ts" setup>
import FilterBar from './FilterBar.vue'
import RequestTable from './RequestTable.vue'
</script>

<style scoped>
.request-table-area {
    min-width: 0;
    min-height: 0;
}

.table-scroll-container {
    min-height: 0;
    display: flex;
    flex-direction: column;
}
</style>
