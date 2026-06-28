import type { SearchMatch } from '@/utils/dom-utils'
import {
    highlightOverlay, clearOverlay
} from '@/utils/dom-utils'
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

    function searchAndHighlight(textarea: HTMLTextAreaElement | null) {
        if (!textarea) return
        const text = textarea.value
        const matches = performSearch(text)
        searchStore.setMatches(pane, matches)

        // Find overlay element - it's now in the Vue template, no DOM manipulation needed
        const wrapper = textarea.parentElement
        const overlay = wrapper?.querySelector<HTMLDivElement>('.highlight-overlay') || null

        if (matches.length > 0 && overlay) {
            highlightOverlay(overlay, text, matches, searchStore[pane].currentIndex)
        } else if (overlay) {
            highlightOverlay(overlay, text, [], -1)
        }
    }

    function highlightHexView(el: HTMLElement | null) {
        if (!el) return
        const text = el.textContent || ''
        const matches = performSearch(text)
        searchStore.setMatches(pane, matches)

        if (matches.length === 0) {
            el.textContent = text
            return
        }

        let html = ''
        let lastIndex = 0
        for (const match of matches) {
            html += escapeText(text.slice(lastIndex, match.start))
            html += `<mark class="search-highlight">${escapeText(text.slice(match.start, match.end))}</mark>`
            lastIndex = match.end
        }
        html += escapeText(text.slice(lastIndex))
        el.innerHTML = html
    }

    function highlightPrettyView(codeEl: HTMLElement | null) {
        if (!codeEl) return
        const text = codeEl.textContent || ''
        const matches = performSearch(text)
        searchStore.setMatches(pane, matches)

        if (matches.length === 0) {
            codeEl.textContent = text
            return
        }

        let html = ''
        let lastIndex = 0
        for (const match of matches) {
            html += escapeText(text.slice(lastIndex, match.start))
            html += `<mark class="search-highlight">${escapeText(text.slice(match.start, match.end))}</mark>`
            lastIndex = match.end
        }
        html += escapeText(text.slice(lastIndex))
        codeEl.innerHTML = html
    }

    function clearHighlights() {
        const contentPane = pane === 'req' ? 'request' : 'response'
        const overlay = document.querySelector<HTMLDivElement>(
            `#${contentPane}-pane .highlight-overlay`
        )
        if (overlay) {
            clearOverlay(overlay)
        }
    }

    function refreshHighlight() {
        const contentPane = pane === 'req' ? 'request' : 'response'
        const tab = selectionStore.activeTab[contentPane]
        const content = pane === 'req' ? selectionStore.requestContent : selectionStore.responseContent
        const text = content[tab]

        if (tab === 'raw') {
            const textarea = document.querySelector<HTMLTextAreaElement>(
                `#${contentPane}-pane textarea.code-view`
            )
            if (textarea) searchAndHighlight(textarea)
        } else if (tab === 'hex') {
            const hexEl = document.querySelector<HTMLElement>(
                `#${contentPane}-pane .hex-display`
            )
            if (hexEl) highlightHexView(hexEl)
        } else if (tab === 'pretty') {
            const codeEl = document.querySelector<HTMLElement>(
                `#${contentPane}-pane code`
            )
            if (codeEl) highlightPrettyView(codeEl)
        }
    }

    function navigateMatch(direction: 'prev' | 'next') {
        searchStore.navigateMatch(pane, direction)
        refreshHighlight()

        const contentPane = pane === 'req' ? 'request' : 'response'
        const paneEl = document.querySelector(`#${contentPane}-pane`)
        if (!paneEl) return

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
        searchAndHighlight,
        highlightHexView,
        highlightPrettyView,
        clearHighlights,
        refreshHighlight,
        navigateMatch
    }
}
