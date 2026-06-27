import type { HarEntry, HarRequest, HarResponse, HarHeader } from '@/types/har'
import { formatJson, formatXml, stringToHex, detectContentType as detectCt } from './string-utils'

export function detectContentType(headers: HarHeader[]): string {
    return detectCt(headers)
}

export function formatBody(body: string, contentType: string): string {
    if (!body) return body
    if (contentType === 'json') return formatJson(body)
    if (contentType === 'xml') return formatXml(body)
    return body
}

export function buildRawRequest(req: HarRequest): string {
    if (!req) return ''
    let result = ''
    result += `${req.method} ${req.url} HTTP/1.1\r\n`
    if (req.headers && req.headers.length > 0) {
        for (const h of req.headers) {
            result += `${h.name}: ${h.value}\r\n`
        }
    }
    result += '\r\n'
    if (req.postData && req.postData.text) {
        result += req.postData.text
    }
    return result
}

export function buildRawResponse(res: HarResponse, body: string): string {
    if (!res) return ''
    let result = ''
    result += `HTTP/1.1 ${res.status} ${res.statusText}\r\n`
    if (res.headers && res.headers.length > 0) {
        for (const h of res.headers) {
            result += `${h.name}: ${h.value}\r\n`
        }
    }
    result += '\r\n'
    if (body) {
        result += body
    }
    return result
}

export function buildPrettyRequest(req: HarRequest): string {
    if (!req) return ''
    let result = ''
    result += `${req.method} ${req.url} HTTP/1.1\r\n`
    if (req.headers && req.headers.length > 0) {
        for (const h of req.headers) {
            result += `${h.name}: ${h.value}\r\n`
        }
    }
    result += '\r\n'
    if (req.postData && req.postData.text) {
        const ct = detectContentType(req.headers)
        result += formatBody(req.postData.text, ct)
    }
    return result
}

export function buildPrettyResponse(res: HarResponse, body: string): string {
    if (!res) return ''
    let result = ''
    result += `HTTP/1.1 ${res.status} ${res.statusText}\r\n`
    if (res.headers && res.headers.length > 0) {
        for (const h of res.headers) {
            result += `${h.name}: ${h.value}\r\n`
        }
    }
    result += '\r\n'
    if (body) {
        const ct = detectContentType(res.headers)
        result += formatBody(body, ct)
    }
    return result
}

export function buildHexRequest(req: HarRequest): string {
    return stringToHex(buildRawRequest(req))
}

export function buildHexResponse(res: HarResponse, body: string): string {
    return stringToHex(buildRawResponse(res, body))
}

export function buildRawRequestFromEntry(entry: HarEntry): string {
    return buildRawRequest(entry.request)
}

export function buildRawResponseFromEntry(entry: HarEntry, body: string): string {
    return buildRawResponse(entry.response, body)
}

export function buildPrettyRequestFromEntry(entry: HarEntry): string {
    return buildPrettyRequest(entry.request)
}

export function buildPrettyResponseFromEntry(entry: HarEntry, body: string): string {
    return buildPrettyResponse(entry.response, body)
}

export function buildHexRequestFromEntry(entry: HarEntry): string {
    return buildHexRequest(entry.request)
}

export function buildHexResponseFromEntry(entry: HarEntry, body: string): string {
    return buildHexResponse(entry.response, body)
}
