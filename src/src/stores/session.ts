import { defineStore } from 'pinia'
import type { SessionField, SessionScheme } from '@/types/har'
import {
    loadAllFields, saveField, updateField, deleteField, toggleFieldEnabled,
    loadSchemes, saveScheme, updateScheme, deleteScheme,
    getSchemeFields, setActiveScheme, getActiveScheme, migrateIfNeeded
} from '@/services/session-storage'
import { applySchemeToRequestAsync } from '@/services/session-extractor'
import type { HarEntry } from '@/types/har'
import { createLogger } from '@/utils/debug-logger'

const logger = createLogger('session')

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
            logger.log('加载所有会话数据...')
            await migrateIfNeeded()
            this.schemes = await loadSchemes()
            this.fields = await loadAllFields()
            this.activeSchemeId = await getActiveScheme()
            this.activeScheme = this.schemes.find(s => s.id === this.activeSchemeId) || null
            if (this.activeScheme) {
                this.activeScheme.fields = await getSchemeFields(this.activeScheme.id)
            }
            logger.log('会话数据加载完成, 方案数:', this.schemes.length, '字段数:', this.fields.length, '激活方案:', this.activeScheme?.name || 'none')
        },

        async addField(field: SessionField) {
            logger.log('添加字段:', field.name, 'mode:', field.mode)
            const result = await saveField(field)
            logger.log('添加字段结果:', result.success ? '成功' : '失败', result.message || '')
            if (result.success) {
                this.fields = await loadAllFields()
                await this.refreshActiveSchemeFields()
            }
            return result
        },

        async editField(field: SessionField) {
            logger.log('编辑字段:', field.id, field.name)
            const result = await updateField(field)
            logger.log('编辑字段结果:', result.success ? '成功' : '失败', result.message || '')
            if (result.success) {
                this.fields = await loadAllFields()
                await this.refreshActiveSchemeFields()
            }
            return result
        },

        async removeField(fieldId: string) {
            logger.log('删除字段:', fieldId)
            await deleteField(fieldId)
            this.fields = await loadAllFields()
            this.schemes = await loadSchemes()
            await this.refreshActiveSchemeFields()
        },

        async toggleField(fieldId: string, enabled: boolean) {
            await toggleFieldEnabled(fieldId, enabled)
        },

        async addScheme(scheme: SessionScheme) {
            logger.log('添加方案:', scheme.name, '域名:', scheme.targetDomains)
            const result = await saveScheme(scheme)
            logger.log('添加方案结果:', result.success ? '成功' : '失败', result.message || '')
            if (result.success) {
                this.schemes = await loadSchemes()
                await this.refreshActiveSchemeFields()
            }
            return result
        },

        async editScheme(scheme: SessionScheme) {
            logger.log('编辑方案:', scheme.id, scheme.name)
            const result = await updateScheme(scheme)
            logger.log('编辑方案结果:', result.success ? '成功' : '失败', result.message || '')
            if (result.success) {
                this.schemes = await loadSchemes()
                await this.refreshActiveSchemeFields()
            }
            return result
        },

        async removeScheme(schemeId: string) {
            logger.log('删除方案:', schemeId)
            await deleteScheme(schemeId)
            this.schemes = await loadSchemes()
            this.fields = await loadAllFields()
            await this.refreshActiveSchemeFields()
        },

        async activateScheme(schemeId: string | null) {
            logger.log('激活方案切换:', schemeId || 'none')
            await setActiveScheme(schemeId)
            this.activeSchemeId = schemeId
            this.schemes = await loadSchemes()
            this.activeScheme = this.schemes.find(s => s.id === schemeId) || null
            if (this.activeScheme) {
                this.activeScheme.fields = await getSchemeFields(this.activeScheme.id)
            }
        },

        async refreshActiveSchemeFields() {
            if (!this.activeSchemeId) {
                this.activeScheme = null
                return
            }
            this.activeScheme = this.schemes.find(s => s.id === this.activeSchemeId) || null
            if (this.activeScheme) {
                this.activeScheme.fields = await getSchemeFields(this.activeScheme.id)
            }
        },

        async checkSessionExtraction(request: HarEntry): Promise<{ keys: string[]; data: Record<string, string> } | null> {
            if (!this.activeScheme) return null
            // Ensure fields are populated before extraction
            if (!this.activeScheme.fields || this.activeScheme.fields.length === 0) {
                this.activeScheme.fields = await getSchemeFields(this.activeScheme.id)
            }
            logger.group('会话提取: ' + (request.request?.url || 'unknown'))
            const result = await applySchemeToRequestAsync(request, this.activeScheme)
            if (result) {
                logger.log('提取成功, 字段:', Object.keys(result).join(', '))
            } else {
                logger.log('提取结果: 无匹配')
            }
            logger.groupEnd()
            return result ? { keys: Object.keys(result), data: result } : null
        }
    }
})
