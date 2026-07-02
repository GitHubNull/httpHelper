import type { HarEntry, SessionField, SessionScheme } from '@/types/har'
import { getSchemeFields } from '@/services/session-storage'
import { createLogger } from '@/utils/debug-logger'

const logger = createLogger('extract')

export interface FieldLocation {
    type: string
    name: string
}

export interface ExtractResult {
    [key: string]: string
}

/** 字段提取选项 */
export interface FieldOptions {
    startOffset?: number
    endOffset?: number
    caseSensitive?: boolean
    groupIndex?: number
    context?: number
}

export function extractSession(request: HarEntry, scheme: SessionScheme): ExtractResult | null {
    if (!request || !scheme || !scheme.fields) return null
    const result: ExtractResult = {}
    for (const field of scheme.fields) {
        if (!field.enabled) continue
        if (field.location?.type === 'response-body') {
            logger.warn('同步提取不支持 response-body，请使用 extractSessionAsync:', field.name)
            continue
        }
        const source = getFieldSource(request, field.location)
        if (source === null) continue
        const value = extractByMode(source, field)
        if (value !== null) {
            result[field.name] = value
            logger.log('字段提取:', field.name, 'mode:', field.mode, '→', value.length > 100 ? value.substring(0, 100) + '...' : value)
        }
    }
    logger.log('提取完成, 结果字段数:', Object.keys(result).length)
    return Object.keys(result).length > 0 ? result : null
}

export function extractByMode(source: string, field: SessionField): string | null {
    if (!source || !field) return null
    const mode = field.mode
    const pattern = field.pattern
    const options = field.options || {}

    switch (mode) {
        case 'full':
            return source
        case 'substring':
            if (!pattern) return null
            return extractSubstring(source, pattern, options)
        case 'regex':
            if (!pattern) return null
            return extractRegex(source, pattern, options)
        case 'keyword':
            if (!pattern) return null
            return extractKeyword(source, pattern, options)
        case 'xpath':
            if (!pattern) return null
            return extractXPath(source, pattern, options)
        case 'jsonpath':
            if (!pattern) return null
            return extractJsonPath(source, pattern, options)
        default:
            return null
    }
}

export function getFieldSource(request: HarEntry, location: FieldLocation): string | null {
    if (!location || !location.type) return null
    if (location.type === 'header') {
        if (!request.request || !request.request.headers) return null
        const header = request.request.headers.find(h => h.name.toLowerCase() === location.name.toLowerCase())
        return header ? header.value : null
    }
    if (location.type === 'body') {
        if (request.request && request.request.postData && request.request.postData.text) {
            return request.request.postData.text
        }
    }
    if (location.type === 'response-header') {
        if (!request.response || !request.response.headers) return null
        const header = request.response.headers.find(h => h.name.toLowerCase() === location.name.toLowerCase())
        return header ? header.value : null
    }
    // response-body is handled asynchronously in extractSessionAsync
    return null
}

/**
 * @deprecated 请使用 applySchemeToRequestAsync，支持异步响应体提取
 */
export function applySchemeToRequest(request: HarEntry, scheme: SessionScheme): ExtractResult | null {
    if (!scheme || !scheme.isActive) return null
    if (!isSchemeApplicable(request, scheme)) return null
    return extractSession(request, scheme)
}

export async function extractSessionAsync(request: HarEntry, scheme: SessionScheme): Promise<ExtractResult | null> {
    if (!request || !scheme) return null

    logger.log('异步提取开始...')
    // Defensive: auto-populate fields from storage if not present
    let fields = scheme.fields
    if ((!fields || fields.length === 0) && Array.isArray(scheme.fieldIds) && scheme.fieldIds.length > 0) {
        fields = await getSchemeFields(scheme.id)
        logger.log('从存储自动填充方案字段, fieldIds:', scheme.fieldIds.length)
    }
    if (!fields || fields.length === 0) return null

    const result: ExtractResult = {}
    const responseBodyFields: SessionField[] = []

    for (const field of fields) {
        if (!field.enabled) continue
        if (field.location?.type === 'response-body') {
            responseBodyFields.push(field)
            continue
        }
        const source = getFieldSource(request, field.location)
        if (source === null) continue
        const value = extractByMode(source, field)
        if (value !== null) {
            result[field.name] = value
        }
    }

    if (responseBodyFields.length > 0) {
        logger.log('处理响应体字段, 数量:', responseBodyFields.length)
        const body = await getResponseBody(request)
        if (body) {
            for (const field of responseBodyFields) {
                const value = extractByMode(body, field)
                if (value !== null) {
                    result[field.name] = value
                }
            }
        }
    }

    logger.log('异步提取完成, 结果字段数:', Object.keys(result).length)
    return Object.keys(result).length > 0 ? result : null
}

export async function applySchemeToRequestAsync(request: HarEntry, scheme: SessionScheme): Promise<ExtractResult | null> {
    if (!scheme || !scheme.isActive) return null
    if (!isSchemeApplicable(request, scheme)) return null
    return extractSessionAsync(request, scheme)
}

function getResponseBody(request: HarEntry, timeout = 5000): Promise<string | null> {
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            logger.warn('getResponseBody 超时，放弃等待响应体')
            resolve(null)
        }, timeout)
        try {
            request.getContent((body: string) => {
                clearTimeout(timer)
                resolve(body || null)
            })
        } catch {
            clearTimeout(timer)
            resolve(null)
        }
    })
}

export function formatExtractResult(result: ExtractResult, scheme: SessionScheme): string {
    const format = scheme.outputFormat || 'key=value'
    switch (format) {
        case 'json':
            return JSON.stringify(result, null, 2)
        case 'custom':
            return applyTemplate(result, scheme.outputTemplate || '')
        case 'key=value':
        default:
            return Object.entries(result)
                .map(([k, v]) => `${k}=${v}`)
                .join('\n')
    }
}

function applyTemplate(result: ExtractResult, template: string): string {
    if (!template) {
        return Object.entries(result)
            .map(([k, v]) => `${k}=${v}`)
            .join('\n')
    }
    return template.replace(/\{\{(.+?)\}\}/g, (_match, key) => {
        return result[key] !== undefined ? result[key] : `{{${key}}}`
    })
}

export function isSchemeApplicable(request: HarEntry, scheme: SessionScheme): boolean {
    if (!request || !scheme) return false
    if ((!scheme.targetDomains || scheme.targetDomains.length === 0) && !scheme.domainRegex) {
        logger.log('方案无域名限制，始终适用:', scheme.name)
        return true
    }
    const url = request.request ? request.request.url : ''
    let hostname = ''
    try {
        hostname = new URL(url).hostname
    } catch {
        logger.warn('URL解析失败:', url)
        return false
    }

    if (scheme.targetDomains && scheme.targetDomains.length > 0) {
        if (scheme.targetDomains.some(d => hostname === d || hostname.endsWith('.' + d))) {
            logger.log('域名匹配成功:', hostname, '匹配:', scheme.targetDomains)
            return true
        }
    }
    if (scheme.domainRegex) {
        try {
            const regex = new RegExp(scheme.domainRegex)
            if (regex.test(hostname)) return true
        } catch {
            /* ignore invalid regex */
        }
    }
    return false
}

function extractSubstring(source: string, pattern: string, options: FieldOptions): string | null {
    const idx = source.indexOf(pattern)
    if (idx === -1) return null
    const startOffset = options.startOffset ?? 0
    const start = startOffset < 0
        ? Math.max(0, source.length + startOffset)
        : idx + startOffset

    let end: number
    if (options.endOffset !== undefined && options.endOffset !== null) {
        const eo = options.endOffset
        end = eo < 0
            ? Math.max(0, source.length + eo)
            : idx + eo
    } else {
        end = source.length
    }

    if (start >= end) return null
    return source.substring(start, end)
}

function extractRegex(source: string, pattern: string, options: FieldOptions): string | null {
    try {
        const regex = new RegExp(pattern, options.caseSensitive ? '' : 'i')
        const match = regex.exec(source)
        if (!match) return null
        const groupIndex = options.groupIndex || 0
        return match[groupIndex] || null
    } catch {
        return null
    }
}

function extractKeyword(source: string, pattern: string, options: FieldOptions): string | null {
    const idx = source.indexOf(pattern)
    if (idx === -1) return null
    const context = options.context || 50
    const start = Math.max(0, idx - context)
    const end = Math.min(source.length, idx + pattern.length + context)
    return source.substring(start, end)
}

function extractXPath(source: string, pattern: string, options: FieldOptions): string | null {
    try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(source, 'application/xml')
        const result = doc.evaluate(pattern, doc, null, XPathResult.STRING_TYPE, null)
        return result.stringValue || null
    } catch {
        return null
    }
}

function extractJsonPath(source: string, pattern: string, options: FieldOptions): string | null {
    try {
        const obj = JSON.parse(source)
        return resolveJsonPath(obj, pattern)
    } catch {
        return null
    }
}

function resolveJsonPath(obj: any, path: string): string | null {
    if (!path || path === '$') return typeof obj === 'object' ? JSON.stringify(obj) : String(obj)

    const normalized = path.replace(/^$.?/, '')
    if (!normalized) return typeof obj === 'object' ? JSON.stringify(obj) : String(obj)

    if (normalized.startsWith('..')) {
        return resolveRecursiveDescent(obj, normalized.substring(2))
    }

    return resolvePathSegments(obj, tokenizePath(normalized))
}

function tokenizePath(path: string): string[] {
    const tokens: string[] = []
    let i = 0
    while (i < path.length) {
        if (path[i] === '.') {
            i++
            if (i < path.length && path[i] === '.') {
                tokens.push('..')
                i++
            }
            continue
        }
        const bracketIdx = path.indexOf('[', i)
        const dotIdx = path.indexOf('.', i)
        let end: number
        if (bracketIdx === -1 && dotIdx === -1) {
            end = path.length
        } else if (bracketIdx === -1) {
            end = dotIdx
        } else if (dotIdx === -1) {
            end = bracketIdx
        } else {
            end = Math.min(bracketIdx, dotIdx)
        }
        const key = path.substring(i, end)
        if (key) tokens.push(key)
        i = end
        while (i < path.length && path[i] === '[') {
            const closeIdx = path.indexOf(']', i)
            if (closeIdx === -1) break
            tokens.push('[' + path.substring(i + 1, closeIdx) + ']')
            i = closeIdx + 1
        }
    }
    return tokens
}

function resolvePathSegments(obj: any, segments: string[]): string | null {
    let current = obj
    for (const seg of segments) {
        if (current === null || current === undefined) return null

        if (seg === '..') {
            current = collectAllDescendants(current)
            continue
        }

        if (seg === '[*]') {
            if (Array.isArray(current)) {
                if (current.length === 0) return null
                const results = current.map(item => {
                    if (typeof item === 'object') return JSON.stringify(item)
                    return String(item)
                })
                current = results.join(', ')
            } else {
                return null
            }
            continue
        }

        const arrMatch = seg.match(/^\[?(\w+)\]?$|^\[(\d+|\*)\]$|^(\w+)\[(\d+|\*)\]$/)
        if (!arrMatch) {
            current = current[seg]
            continue
        }

        const namedKey = arrMatch[1] || arrMatch[3]
        const indexPart = arrMatch[2] || arrMatch[4]

        if (namedKey) {
            current = current[namedKey]
        }

        if (indexPart !== undefined) {
            if (!Array.isArray(current)) return null
            if (indexPart === '*') {
                const results = current.map(item => {
                    if (typeof item === 'object') return JSON.stringify(item)
                    return String(item)
                })
                current = results.join(', ')
            } else {
                const idx = parseInt(indexPart, 10)
                if (idx < 0 || idx >= current.length) return null
                current = current[idx]
            }
        }
    }

    if (current === null || current === undefined) return null
    return typeof current === 'object' ? JSON.stringify(current) : String(current)
}

const MAX_RECURSION_DEPTH = 50

function resolveRecursiveDescent(obj: any, remainingPath: string): string | null {
    const results = findRecursive(obj, remainingPath)
    if (results.length === 0) return null
    if (results.length === 1) return typeof results[0] === 'object' ? JSON.stringify(results[0]) : String(results[0])
    return JSON.stringify(results)
}

function findRecursive(obj: any, targetKey: string, depth: number = 0): any[] {
    const results: any[] = []
    if (obj === null || obj === undefined) return results
    if (depth > MAX_RECURSION_DEPTH) {
        logger.warn('findRecursive 递归深度超限:', depth, 'targetKey:', targetKey)
        return results
    }

    if (typeof obj === 'object' && !Array.isArray(obj)) {
        if (targetKey in obj) {
            results.push(obj[targetKey])
        }
        for (const value of Object.values(obj)) {
            results.push(...findRecursive(value, targetKey, depth + 1))
        }
    } else if (Array.isArray(obj)) {
        for (const item of obj) {
            results.push(...findRecursive(item, targetKey, depth + 1))
        }
    }
    return results
}

function collectAllDescendants(obj: any, depth: number = 0): any[] {
    const results: any[] = []
    if (obj === null || obj === undefined) return results
    if (depth > MAX_RECURSION_DEPTH) {
        logger.warn('collectAllDescendants 递归深度超限:', depth)
        return results
    }
    if (Array.isArray(obj)) {
        for (const item of obj) {
            results.push(...collectAllDescendants(item, depth + 1))
        }
    } else if (typeof obj === 'object') {
        for (const value of Object.values(obj)) {
            results.push(value)
            results.push(...collectAllDescendants(value, depth + 1))
        }
    }
    return results
}
