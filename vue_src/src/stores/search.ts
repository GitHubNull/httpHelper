import { defineStore } from 'pinia'
import type { SearchMatch } from '@/utils/dom-utils'

export interface PaneSearchState {
    text: string
    useRegex: boolean
    caseSensitive: boolean
    matches: SearchMatch[]
    currentIndex: number
}

export const useSearchStore = defineStore('search', {
    state: () => ({
        req: {
            text: '', useRegex: false, caseSensitive: false,
            matches: [] as SearchMatch[], currentIndex: -1
        } as PaneSearchState,
        res: {
            text: '', useRegex: false, caseSensitive: false,
            matches: [] as SearchMatch[], currentIndex: -1
        } as PaneSearchState
    }),

    actions: {
        performSearch(pane: 'req' | 'res', text: string) {
            const state = this[pane]
            state.text = text
            if (!text) {
                state.matches = []
                state.currentIndex = -1
                return
            }
            const flags = state.caseSensitive ? 'g' : 'gi'
            let regex: RegExp
            try {
                if (state.useRegex) {
                    regex = new RegExp(text, flags)
                } else {
                    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    regex = new RegExp(escaped, flags)
                }
            } catch {
                state.matches = []
                state.currentIndex = -1
                return
            }

            const matches: SearchMatch[] = []
            // Note: actual search target text will be passed in or accessed via selection store
            // This action sets up the pattern; matches are computed in the composable
            state.matches = matches
            state.currentIndex = -1
        },

        setSearchText(pane: 'req' | 'res', text: string) {
            this[pane].text = text
        },

        toggleRegex(pane: 'req' | 'res') {
            this[pane].useRegex = !this[pane].useRegex
        },

        toggleCaseSensitive(pane: 'req' | 'res') {
            this[pane].caseSensitive = !this[pane].caseSensitive
        },

        setMatches(pane: 'req' | 'res', matches: SearchMatch[]) {
            this[pane].matches = matches
            this[pane].currentIndex = matches.length > 0 ? 0 : -1
        },

        navigateMatch(pane: 'req' | 'res', direction: 'prev' | 'next') {
            const state = this[pane]
            if (state.matches.length === 0) return
            state.currentIndex = direction === 'next'
                ? (state.currentIndex + 1) % state.matches.length
                : (state.currentIndex - 1 + state.matches.length) % state.matches.length
        },

        clearSearch(pane: 'req' | 'res') {
            this[pane].text = ''
            this[pane].matches = []
            this[pane].currentIndex = -1
        },

        getMatchCount(pane: 'req' | 'res'): number {
            return this[pane].matches.length
        },

        getSearchCountText(pane: 'req' | 'res'): string {
            const state = this[pane]
            if (state.matches.length > 0 && state.currentIndex >= 0) {
                return `${state.currentIndex + 1}/${state.matches.length} 个高亮`
            }
            return '0 个高亮'
        }
    }
})
