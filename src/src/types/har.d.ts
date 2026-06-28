export interface HarHeader {
    name: string
    value: string
}

export interface HarPostData {
    text?: string
    params?: Array<{ name: string; value: string }>
}

export interface HarContent {
    size: number
    mimeType: string
}

export interface HarRequest {
    method: string
    url: string
    headers: HarHeader[]
    postData?: HarPostData
}

export interface HarResponse {
    status: number
    statusText: string
    headers: HarHeader[]
    content?: HarContent
}

export interface HarEntry {
    request: HarRequest
    response: HarResponse
    startedDateTime: string
    time: number
    getContent: (callback: (body: string, encoding: string) => void) => void
    _uid?: number
    _reqStartTime?: string | null
    _resEndTime?: string | null
    _resourceType?: string
}

export interface SessionField {
    id: string
    name: string
    location: { type: string; name: string }
    mode: string
    pattern: string
    enabled: boolean
    createdAt?: number
    updatedAt?: number
    options?: {
        startOffset?: number
        endOffset?: number
        caseSensitive?: boolean
        groupIndex?: number
        context?: number
    }
}

export interface SessionScheme {
    id: string
    name: string
    targetDomains: string[]
    domainRegex: string
    description: string
    fieldIds: string[]
    isActive: boolean
    fields?: SessionField[]
    createdAt?: number
    updatedAt?: number
}

export interface RequestMeta {
    color: string | null
    note: string
}
