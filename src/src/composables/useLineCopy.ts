import { ref } from 'vue'
import { copyText } from '@/utils/clipboard-utils'

/** 行高：font-size 11px * line-height 1.4 ≈ 15.4px */
export const LINE_HEIGHT = 11 * 1.4

/**
 * 根据鼠标点击位置和内容文本，计算所在行索引及内容
 */
export function getLineFromClick(
    e: MouseEvent,
    containerEl: HTMLElement,
    content: string
): { index: number; text: string } | null {
    const rect = containerEl.getBoundingClientRect()
    const paddingTop = parseFloat(getComputedStyle(containerEl).paddingTop) || 2
    const scrollTop = containerEl.scrollTop
    const y = e.clientY - rect.top - paddingTop + scrollTop
    const lineIndex = Math.floor(y / LINE_HEIGHT)
    const lines = content.split('\n')
    if (lineIndex < 0 || lineIndex >= lines.length) return null
    return { index: lineIndex, text: lines[lineIndex] }
}

/**
 * 根据 textarea 光标位置获取当前行
 */
export function getCurrentLineFromTextarea(
    el: HTMLTextAreaElement
): { index: number; text: string } | null {
    const pos = el.selectionStart
    const before = el.value.substring(0, pos)
    const lineIndex = before.split('\n').length - 1
    const lines = el.value.split('\n')
    if (lineIndex < 0 || lineIndex >= lines.length) return null
    return { index: lineIndex, text: lines[lineIndex] }
}

/**
 * 复制指定行到剪贴板（异步返回成功状态，调用方自行处理 Toast 通知）
 */
export async function copyLineContent(text: string, lineIdx: number): Promise<{ ok: boolean; lineIdx: number }> {
    // strip any visual markers that might have been appended for display
    const cleanText = text.replace(/↵$/g, '')
    const ok = await copyText(cleanText)
    return { ok, lineIdx }
}

/**
 * 为报文内容添加换行符可视化标记（在每行末尾追加 ↵）
 */
export function applyLineBreakMarkers(content: string, enabled: boolean): string {
    if (!enabled || !content) return content
    return content
        .split('\n')
        .map(line => line + '↵')
        .join('\n')
}

/**
 * 通用的键盘快捷键处理：Ctrl+Shift+C 复制当前行
 * 返回 true 表示已处理该快捷键
 */
export function handleLineCopyShortcut(
    e: KeyboardEvent,
    copyFn: () => void
): boolean {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault()
        copyFn()
        return true
    }
    return false
}

/**
 * 将纯文本内容渲染为带换行符标记的 HTML
 */
export function renderContentWithLineBreaks(content: string, showBreaks: boolean): string {
    if (!showBreaks || !content) return escapeHtmlForOverlay(content)
    const lines = content.split('\n')
    return lines.map(line =>
        escapeHtmlForOverlay(line) + '<span class="line-break-marker">↵</span>'
    ).join('\n')
}

function escapeHtmlForOverlay(text: string): string {
    if (!text) return ''
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}
