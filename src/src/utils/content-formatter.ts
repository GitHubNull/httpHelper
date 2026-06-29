import type { HarEntry, HarRequest, HarResponse, HarHeader } from '@/types/har'
import { formatJson, formatXml, stringToHex, detectContentType as detectCt } from './string-utils'
import { base64ToBytes } from './clipboard-utils'

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
        // 剥离 body 前导 \r\n，防止头体分隔符后出现多余空行
        result += body.replace(/^[\r\n]+/, '')
    }
    return result
}

export function buildPrettyRequest(req: HarRequest): string {
    if (!req) return ''
    let result = ''
    result += `${req.method} ${req.url} HTTP/1.1\n`
    if (req.headers && req.headers.length > 0) {
        for (const h of req.headers) {
            result += `${h.name}: ${h.value}\n`
        }
    }
    result += '\n'
    if (req.postData && req.postData.text) {
        const ct = detectContentType(req.headers)
        result += formatBody(req.postData.text, ct)
    }
    return result
}

export function buildPrettyResponse(res: HarResponse, body: string): string {
    if (!res) return ''
    let result = ''
    result += `HTTP/1.1 ${res.status} ${res.statusText}\n`
    if (res.headers && res.headers.length > 0) {
        for (const h of res.headers) {
            result += `${h.name}: ${h.value}\n`
        }
    }
    result += '\n'
    if (body) {
        // 剥离 body 前导 \r\n，防止头体分隔符后出现多余空行
        const cleanBody = body.replace(/^[\r\n]+/, '')
        const ct = detectContentType(res.headers)
        result += formatBody(cleanBody, ct)
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

// 判断报文体是否为二进制：有 body 且类型为 binary
export function isBodyBinary(headers: HarHeader[], body: string): boolean {
    if (!body) return false
    return detectContentType(headers) === 'binary'
}

// 将 body 转换为字节数组（根据 encoding 决定解码方式）
export function bodyToBytes(body: string, encoding: string): Uint8Array {
    if (!body) return new Uint8Array(0)
    if (encoding === 'base64') {
        return base64ToBytes(body)
    }
    return new TextEncoder().encode(body)
}

// 构建完整 HTTP 报文字节（头文本字节 + 体字节）
export function buildBinaryMessage(headerText: string, body: string, encoding: string): Uint8Array {
    const headerBytes = new TextEncoder().encode(headerText)
    const bodyBytes = bodyToBytes(body, encoding)
    const combined = new Uint8Array(headerBytes.length + bodyBytes.length)
    combined.set(headerBytes, 0)
    combined.set(bodyBytes, headerBytes.length)
    return combined
}
