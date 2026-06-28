import type { HarEntry, SessionField, SessionScheme } from '@/types/har'

export interface FieldLocation {
    type: string
    name: string
}

export interface ExtractResult {
    [key: string]: string
}

export function extractSession(request: HarEntry, scheme: SessionScheme): ExtractResult | null {
    if (!request || !scheme || !scheme.fields) return null
    const result: ExtractResult = {}
    for (const field of scheme.fields) {
        if (!field.enabled) continue
        const source = getFieldSource(request, field.location)
        if (source === null) continue
        const value = extractByMode(source, field)
        if (value !== null) {
            result[field.name] = value
        }
    }
    return Object.keys(result).length > 0 ? result : null
}

export function extractByMode(source: string, field: SessionField): string | null {
    if (!source || !field || !field.pattern) return null
    const mode = field.mode
    const pattern = field.pattern
    const options = field.options || {}

    switch (mode) {
        case 'substring':
            return extractSubstring(source, pattern, options)
        case 'regex':
            return extractRegex(source, pattern, options)
        case 'keyword':
            return extractKeyword(source, pattern, options)
        case 'xpath':
            return extractXPath(source, pattern, options)
        case 'jsonpath':
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
    return null
}

export function applySchemeToRequest(request: HarEntry, scheme: SessionScheme): ExtractResult | null {
    if (!scheme || !scheme.isActive) return null
    if (!isSchemeApplicable(request, scheme)) return null
    return extractSession(request, scheme)
}

export function isSchemeApplicable(request: HarEntry, scheme: SessionScheme): boolean {
    if (!request || !scheme) return false
    if (!scheme.targetDomains && !scheme.domainRegex) return true
    const url = request.request ? request.request.url : ''
    let hostname = ''
    try {
        hostname = new URL(url).hostname
    } catch {
        return false
    }

    if (scheme.targetDomains && scheme.targetDomains.length > 0) {
        if (scheme.targetDomains.some(d => hostname === d || hostname.endsWith('.' + d))) return true
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

function extractSubstring(source: string, pattern: string, options: any): string | null {
    const idx = source.indexOf(pattern)
    if (idx === -1) return null
    const start = idx + (options.startOffset || 0)
    const end = options.endOffset !== undefined ? idx + options.endOffset : source.length
    return source.substring(start, end)
}

function extractRegex(source: string, pattern: string, options: any): string | null {
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

function extractKeyword(source: string, pattern: string, options: any): string | null {
    const idx = source.indexOf(pattern)
    if (idx === -1) return null
    const context = options.context || 50
    const start = Math.max(0, idx - context)
    const end = Math.min(source.length, idx + pattern.length + context)
    return source.substring(start, end)
}

function extractXPath(source: string, pattern: string, options: any): string | null {
    try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(source, 'application/xml')
        const result = doc.evaluate(pattern, doc, null, XPathResult.STRING_TYPE, null)
        return result.stringValue || null
    } catch {
        return null
    }
}

function extractJsonPath(source: string, pattern: string, options: any): string | null {
    try {
        const obj = JSON.parse(source)
        return resolveJsonPath(obj, pattern)
    } catch {
        return null
    }
}

function resolveJsonPath(obj: any, path: string): string | null {
    if (!path || path === '$') return JSON.stringify(obj)
    const parts = path.replace(/^\$\.?/, '').split('.')
    let current = obj
    for (const part of parts) {
        if (current === null || current === undefined) return null
        const arrMatch = part.match(/^([^\[]+)\[(\d+)\]$/)
        if (arrMatch) {
            const key = arrMatch[1]
            const idx = parseInt(arrMatch[2], 10)
            current = current[key]
            if (Array.isArray(current)) {
                current = current[idx]
            } else {
                return null
            }
        } else {
            current = current[part]
        }
    }
    if (current === null || current === undefined) return null
    return typeof current === 'object' ? JSON.stringify(current) : String(current)
}
