export async function copyText(text: string): Promise<boolean> {
    // 输入校验：拒绝 null / undefined / 空字符串
    if (text == null || text === '') {
        return false
    }

    // 优先使用 execCommand（扩展 DevTools 面板中可靠且无 Permissions Policy 限制），
    // 其次使用 Clipboard API（现代浏览器标准 API）
    if (document.body) {
        const ta = document.createElement('textarea')
        try {
            ta.value = text
            ta.style.position = 'fixed'
            ta.style.opacity = '0'
            document.body.appendChild(ta)
            ta.select()
            const success = document.execCommand('copy')
            if (success) return true
            // execCommand 返回 false，fallthrough 到 Clipboard API
        } catch {
            // execCommand 抛出异常，fallthrough 到 Clipboard API
        } finally {
            // 确保无论成功或失败，textarea 都被移除
            if (ta.parentNode) {
                ta.parentNode.removeChild(ta)
            }
        }
    }

    // Clipboard API fallback（execCommand 不可用 / body 未就绪 / execCommand 失败）
    try {
        await navigator.clipboard.writeText(text)
        return true
    } catch {
        return false
    }
}

export function downloadText(text: string, filename: string): void {
    if (!document.body) return
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    try {
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
    } finally {
        if (a.parentNode) {
            a.parentNode.removeChild(a)
        }
        URL.revokeObjectURL(url)
    }
}

export function base64ToBytes(base64: string): Uint8Array {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
}

export function downloadBinary(bytes: Uint8Array, filename: string): void {
    if (!document.body) return
    const blob = new Blob([bytes as BlobPart], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    try {
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
    } finally {
        if (a.parentNode) {
            a.parentNode.removeChild(a)
        }
        URL.revokeObjectURL(url)
    }
}
