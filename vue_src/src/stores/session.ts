import { defineStore } from 'pinia'
import type { SessionField, SessionScheme } from '@/types/har'
import {
    loadAllFields, saveField, updateField, deleteField, toggleFieldEnabled,
    loadSchemes, saveScheme, updateScheme, deleteScheme,
    getSchemeFields, setActiveScheme, getActiveScheme, migrateIfNeeded
} from '@/services/session-storage'
import { applySchemeToRequest } from '@/services/session-extractor'
import type { HarEntry } from '@/types/har'

export const useSessionStore = defineStore('session', {
    state: () => ({
        schemes: [] as SessionScheme[],
        fields: [] as SessionField[],
        activeScheme: null as SessionScheme | null,
        activeSchemeId: null as string | null,
        editingFieldId: null as string | null,
        editingSchemeId: null as string | null,
        fieldsSearchText: '',
        schemesSearchText: ''
    }),

    getters: {
        filteredFields(state): SessionField[] {
            const filterText = state.fieldsSearchText.toLowerCase().trim()
            if (!filterText) return state.fields
            return state.fields.filter(f => {
                return (f.name || '').toLowerCase().includes(filterText)
                    || (f.mode || '').toLowerCase().includes(filterText)
                    || (f.pattern || '').toLowerCase().includes(filterText)
                    || (f.location && f.location.name || '').toLowerCase().includes(filterText)
            })
        },

        filteredSchemes(state): SessionScheme[] {
            const filterText = state.schemesSearchText.toLowerCase().trim()
            if (!filterText) return state.schemes
            return state.schemes.filter(s => {
                return (s.name || '').toLowerCase().includes(filterText)
                    || (s.targetDomains || []).join(', ').toLowerCase().includes(filterText)
                    || (s.description || '').toLowerCase().includes(filterText)
            })
        }
    },

    actions: {
        async loadAll() {
            await migrateIfNeeded()
            this.schemes = await loadSchemes()
            this.fields = await loadAllFields()
            this.activeSchemeId = await getActiveScheme()
            this.activeScheme = this.schemes.find(s => s.id === this.activeSchemeId) || null
            if (this.activeScheme) {
                this.activeScheme.fields = await getSchemeFields(this.activeScheme.id)
            }
        },

        async addField(field: SessionField) {
            const result = await saveField(field)
            if (result.success) {
                this.fields = await loadAllFields()
            }
            return result
        },

        async editField(field: SessionField) {
            const result = await updateField(field)
            if (result.success) {
                this.fields = await loadAllFields()
            }
            return result
        },

        async removeField(fieldId: string) {
            await deleteField(fieldId)
            this.fields = await loadAllFields()
            this.schemes = await loadSchemes()
        },

        async toggleField(fieldId: string, enabled: boolean) {
            await toggleFieldEnabled(fieldId, enabled)
        },

        async addScheme(scheme: SessionScheme) {
            const result = await saveScheme(scheme)
            if (result.success) {
                this.schemes = await loadSchemes()
            }
            return result
        },

        async editScheme(scheme: SessionScheme) {
            const result = await updateScheme(scheme)
            if (result.success) {
                this.schemes = await loadSchemes()
            }
            return result
        },

        async removeScheme(schemeId: string) {
            await deleteScheme(schemeId)
            this.schemes = await loadSchemes()
            this.fields = await loadAllFields()
        },

        async activateScheme(schemeId: string | null) {
            await setActiveScheme(schemeId)
            this.activeSchemeId = schemeId
            this.schemes = await loadSchemes()
            this.activeScheme = this.schemes.find(s => s.id === schemeId) || null
            if (this.activeScheme) {
                this.activeScheme.fields = await getSchemeFields(this.activeScheme.id)
            }
        },

        checkSessionExtraction(request: HarEntry): { keys: string[]; data: Record<string, string> } | null {
            if (!this.activeScheme) return null
            const result = applySchemeToRequest(request, this.activeScheme)
            if (result) {
                return { keys: Object.keys(result), data: result }
            }
            return null
        }
    }
})
