import type { SessionField, SessionScheme } from '@/types/har'
import { createLogger } from '@/utils/debug-logger'

const logger = createLogger('storage')

const STORAGE_KEY_SCHEMES = 'httpHelper_sessionSchemes'
const STORAGE_KEY_FIELDS = 'httpHelper_sessionFields_v2'
const STORAGE_KEY_ACTIVE = 'httpHelper_activeSchemeId'
const STORAGE_KEY_FIELDS_OLD = 'httpHelper_sessionFields'

export interface OperationResult {
    success: boolean
    message?: string
    field?: SessionField
    scheme?: SessionScheme
}

function chromeGet(keys: string[]): Promise<Record<string, any>> {
    return new Promise((resolve) => {
        chrome.storage.local.get(keys, resolve)
    })
}

function chromeSet(items: Record<string, any>): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.local.set(items, resolve)
    })
}

export async function loadAllFields(): Promise<SessionField[]> {
    const result = await chromeGet([STORAGE_KEY_FIELDS])
    return result[STORAGE_KEY_FIELDS] || []
}

export async function saveField(field: SessionField): Promise<OperationResult> {
    const fields = await loadAllFields()
    const existing = fields.find(f =>
        f.name === field.name &&
        f.pattern === field.pattern &&
        f.mode === field.mode &&
        f.location?.type === field.location?.type &&
        f.location?.name === field.location?.name
    )
    if (existing) {
        logger.warn('字段已存在:', field.name)
        return { success: false, message: '相关数据已存在' }
    }
    field.id = field.id || 'field_' + Date.now()
    field.createdAt = field.createdAt || Date.now()
    field.updatedAt = Date.now()
    field.enabled = field.enabled !== false
    fields.push(field)
    await setAllFields(fields)
    logger.log('字段保存成功:', field.name, 'id:', field.id)
    return { success: true, field }
}

export async function updateField(field: SessionField): Promise<OperationResult> {
    const fields = await loadAllFields()
    const idx = fields.findIndex(f => f.id === field.id)
    if (idx === -1) {
        logger.warn('字段不存在, 无法更新:', field.id)
        return { success: false, message: '字段不存在' }
    }
    field.updatedAt = Date.now()
    fields[idx] = { ...fields[idx], ...field }
    await setAllFields(fields)
    logger.log('字段更新成功:', field.name, 'id:', field.id)
    return { success: true }
}

export async function deleteField(fieldId: string): Promise<OperationResult> {
    const fields = await loadAllFields()
    const filtered = fields.filter(f => f.id !== fieldId)
    await setAllFields(filtered)
    const schemes = await loadSchemes()
    let changed = false
    for (const s of schemes) {
        if (Array.isArray(s.fieldIds) && s.fieldIds.includes(fieldId)) {
            s.fieldIds = s.fieldIds.filter((id: string) => id !== fieldId)
            changed = true
        }
    }
    if (changed) {
        await setSchemes(schemes)
        logger.log('从方案中移除字段引用:', fieldId)
    }
    logger.log('字段删除成功:', fieldId)
    return { success: true }
}

export async function toggleFieldEnabled(fieldId: string, enabled: boolean): Promise<OperationResult> {
    const fields = await loadAllFields()
    const field = fields.find(f => f.id === fieldId)
    if (!field) return { success: false }
    field.enabled = enabled
    field.updatedAt = Date.now()
    await setAllFields(fields)
    return { success: true }
}

export async function loadSchemes(): Promise<SessionScheme[]> {
    const result = await chromeGet([STORAGE_KEY_SCHEMES])
    const raw = result[STORAGE_KEY_SCHEMES] || []
    return normalizeSchemes(raw)
}

function normalizeSchemes(schemes: any[]): SessionScheme[] {
    return schemes.map(s => ({
        ...s,
        fieldIds: Array.isArray(s.fieldIds) ? s.fieldIds : [],
        targetDomains: Array.isArray(s.targetDomains) ? s.targetDomains : []
    }))
}

export async function saveScheme(scheme: SessionScheme): Promise<OperationResult> {
    const schemes = await loadSchemes()
    const existing = schemes.find(s =>
        s.name === scheme.name &&
        JSON.stringify(s.targetDomains || []) === JSON.stringify(scheme.targetDomains || []) &&
        s.domainRegex === scheme.domainRegex
    )
    if (existing) {
        logger.warn('方案已存在:', scheme.name)
        return { success: false, message: '相关数据已存在' }
    }
    scheme.id = scheme.id || 'scheme_' + Date.now()
    scheme.createdAt = scheme.createdAt || Date.now()
    scheme.updatedAt = Date.now()
    scheme.isActive = scheme.isActive || false
    scheme.fieldIds = Array.isArray(scheme.fieldIds) ? scheme.fieldIds : []
    schemes.push(scheme)
    await setSchemes(schemes)
    logger.log('方案保存成功:', scheme.name, 'id:', scheme.id)
    return { success: true, scheme }
}

export async function updateScheme(scheme: SessionScheme): Promise<OperationResult> {
    const schemes = await loadSchemes()
    const idx = schemes.findIndex(s => s.id === scheme.id)
    if (idx === -1) {
        logger.warn('方案不存在, 无法更新:', scheme.id)
        return { success: false, message: '方案不存在' }
    }
    scheme.updatedAt = Date.now()
    // Defensive: ensure fieldIds is always an array (not a truthy object like {})
    const safeScheme = { ...scheme, fieldIds: Array.isArray(scheme.fieldIds) ? scheme.fieldIds : [] }
    schemes[idx] = { ...schemes[idx], ...safeScheme }
    await setSchemes(schemes)
    logger.log('方案更新成功:', scheme.name, 'id:', scheme.id)
    return { success: true }
}

export async function deleteScheme(schemeId: string): Promise<OperationResult> {
    const schemes = await loadSchemes()
    const filtered = schemes.filter(s => s.id !== schemeId)
    await setSchemes(filtered)
    logger.log('方案删除成功:', schemeId)
    return { success: true }
}

export async function getSchemeFields(schemeId: string): Promise<SessionField[]> {
    const schemes = await loadSchemes()
    const scheme = schemes.find(s => s.id === schemeId)
    if (!scheme || !Array.isArray(scheme.fieldIds) || scheme.fieldIds.length === 0) return []
    const allFields = await loadAllFields()
    return allFields.filter(f => scheme.fieldIds.includes(f.id))
}

export async function setSchemeFields(schemeId: string, fieldIds: string[]): Promise<OperationResult> {
    const schemes = await loadSchemes()
    const scheme = schemes.find(s => s.id === schemeId)
    if (!scheme) return { success: false, message: '方案不存在' }
    scheme.fieldIds = fieldIds
    scheme.updatedAt = Date.now()
    await setSchemes(schemes)
    return { success: true }
}

export async function getFieldSchemes(fieldId: string): Promise<SessionScheme[]> {
    const schemes = await loadSchemes()
    return schemes.filter(s => Array.isArray(s.fieldIds) && s.fieldIds.includes(fieldId))
}

export async function getActiveScheme(): Promise<string | null> {
    const result = await chromeGet([STORAGE_KEY_ACTIVE])
    return result[STORAGE_KEY_ACTIVE] || null
}

export async function setActiveScheme(schemeId: string | null): Promise<OperationResult> {
    const schemes = await loadSchemes()
    for (const s of schemes) {
        s.isActive = (s.id === schemeId)
        s.updatedAt = Date.now()
    }
    await setSchemes(schemes)
    await chromeSet({ [STORAGE_KEY_ACTIVE]: schemeId })
    return { success: true }
}

export async function migrateIfNeeded(): Promise<void> {
    const newFields = await loadAllFields()
    if (newFields.length > 0) return
    const oldData = await chromeGet([STORAGE_KEY_FIELDS_OLD])
    const oldFields = oldData[STORAGE_KEY_FIELDS_OLD] || {}
    if (Object.keys(oldFields).length === 0) return
    logger.log('开始数据迁移, 旧字段方案数:', Object.keys(oldFields).length)
    const allFields: SessionField[] = []
    const schemes = await loadSchemes()
    for (const [schemeId, fields] of Object.entries(oldFields)) {
        const scheme = schemes.find(s => s.id === schemeId)
        if (scheme && !Array.isArray(scheme.fieldIds)) {
            scheme.fieldIds = []
        }
        for (const f of fields as any[]) {
            delete f.schemeId
            allFields.push(f)
            if (scheme) scheme.fieldIds!.push(f.id)
        }
    }
    await setAllFields(allFields)
    await setSchemes(schemes)
    logger.log('数据迁移完成, 新字段数:', allFields.length)
}

async function setAllFields(fields: SessionField[]): Promise<void> {
    await chromeSet({ [STORAGE_KEY_FIELDS]: fields })
}

async function setSchemes(schemes: SessionScheme[]): Promise<void> {
    await chromeSet({ [STORAGE_KEY_SCHEMES]: schemes })
}
