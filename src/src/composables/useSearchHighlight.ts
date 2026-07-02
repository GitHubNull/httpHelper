import type { SearchMatch } from '@/utils/dom-utils'
import { useSearchStore } from '@/stores/search'
import { useSelectionStore } from '@/stores/selection'

export function useSearchHighlight(pane: 'req' | 'res') {
    const searchStore = useSearchStore()
    const selectionStore = useSelectionStore()

    function performSearch(text: string): SearchMatch[] {
        const state = searchStore[pane]
        if (!text || !state.text) return []

        const flags = state.caseSensitive ? 'g' : 'gi'
        let regex: RegExp
        try {
            if (state.useRegex) {
                regex = new RegExp(state.text, flags)
            } else {
                const escaped = state.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                regex = new RegExp(escaped, flags)
            }
        } catch {
            return []
        }

        const matches: SearchMatch[] = []
        let match: RegExpExecArray | null
        while ((match = regex.exec(text)) !== null) {
            matches.push({ start: match.index, end: match.index + match[0].length })
            if (match[0].length === 0) regex.lastIndex++
        }
        return matches
    }

    /**
     * 对所有 .line-content-cell 应用搜索高亮
     */
    function highlightCells(container: HTMLElement | null) {
        if (!container) return
        const cells = container.querySelectorAll<HTMLElement>('.line-content-cell')
        if (cells.length === 0) return

        // 拼接完整文本（用于搜索匹配）
        const lines: string[] = []
        for (const cell of cells) {
            lines.push(cell.textContent || '')
        }
        const fullText = lines.join('\n')
        const matches = performSearch(fullText)
        searchStore.setMatches(pane, matches)

        if (matches.length === 0) {
            restoreCells(container)
            return
        }

        // 计算每行的字符偏移范围
        let offset = 0
        const lineRanges: { start: number; end: number }[] = []
        for (const line of lines) {
            lineRanges.push({ start: offset, end: offset + line.length })
            offset += line.length + 1 // +1 for newline
        }

        // 对每行应用高亮
        const currentIdx = searchStore[pane].currentIndex
        let matchGlobalIdx = 0
        cells.forEach((cell, lineIdx) => {
            const range = lineRanges[lineIdx]
            if (!range) return
            const lineText = lines[lineIdx]

            // 找出落在本行的匹配
            const lineMatches: { start: number; end: number; globalIdx: number }[] = []
            for (let mi = 0; mi < matches.length; mi++) {
                const m = matches[mi]
                if (m.end <= range.start) continue
                if (m.start >= range.end) break
                const localStart = Math.max(0, m.start - range.start)
                const localEnd = Math.min(lineText.length, m.end - range.start)
                lineMatches.push({ start: localStart, end: localEnd, globalIdx: mi })
            }

            if (lineMatches.length === 0) {
                cell.textContent = lineText
                return
            }

            // 构建带高亮的 HTML
            let html = ''
            let lastEnd = 0
            for (const lm of lineMatches) {
                html += escapeText(lineText.slice(lastEnd, lm.start))
                const isCurrent = lm.globalIdx === currentIdx
                html += `<mark class="search-highlight${isCurrent ? ' search-highlight-current' : ''}">${escapeText(lineText.slice(lm.start, lm.end))}</mark>`
                lastEnd = lm.end
            }
            html += escapeText(lineText.slice(lastEnd))
            cell.innerHTML = html
        })
    }

    /**
     * 恢复所有 .line-content-cell 的原始内容
     */
    function restoreCells(container: HTMLElement | null) {
        if (!container) return
        const cells = container.querySelectorAll<HTMLElement>('.line-content-cell')
        for (const cell of cells) {
            const original = cell.dataset.original
            if (original !== undefined) {
                if (cell.dataset.isHtml === 'true') {
                    cell.innerHTML = original
                } else {
                    cell.textContent = original
                }
            }
        }
    }

    function clearHighlights() {
        const contentPane = pane === 'req' ? 'request' : 'response'
        const container = document.querySelector<HTMLElement>(
            `#${contentPane}-pane .code-table`
        )
        restoreCells(container)
    }

    function refreshHighlight() {
        const contentPane = pane === 'req' ? 'request' : 'response'
        const tab = selectionStore.activeTab[contentPane]
        const paneEl = document.querySelector(`#${contentPane}-pane`)
        if (!paneEl) return

        const container = paneEl.querySelector<HTMLElement>('.code-table')
        highlightCells(container)
    }

    function navigateMatch(direction: 'prev' | 'next') {
        searchStore.navigateMatch(pane, direction)

        const contentPane = pane === 'req' ? 'request' : 'response'
        const paneEl = document.querySelector(`#${contentPane}-pane`)
        if (!paneEl) return

        // 先恢复再重新高亮（更新 currentIndex 的样式）
        const container = paneEl.querySelector<HTMLElement>('.code-table')
        highlightCells(container)

        // 滚动到当前匹配
        const marks = paneEl.querySelectorAll('mark.search-highlight')
        const idx = searchStore[pane].currentIndex
        if (marks[idx]) {
            marks[idx].scrollIntoView({ block: 'center', behavior: 'smooth' })
        }
    }

    function escapeText(text: string): string {
        if (!text) return ''
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
    }

    return {
        performSearch,
        clearHighlights,
        refreshHighlight,
        navigateMatch
    }
}
