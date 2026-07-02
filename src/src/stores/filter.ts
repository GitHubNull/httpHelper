import { defineStore } from 'pinia'
import { useNetworkStore } from './network'
import { getResourceCategory } from '@/utils/string-utils'
import type { HarEntry } from '@/types/har'
import { createLogger } from '@/utils/debug-logger'

const logger = createLogger('filter')

export interface FilterState {
    method: string
    type: string
    color: string
    keyword: string
    fetchXhr: boolean
    useRegex: boolean
    caseSensitive: boolean
    invert: boolean
}

export interface SortState {
    column: string | null
    direction: 'asc' | 'desc'
}

export const useFilterStore = defineStore('filter', {
    state: () => ({
        filterState: {
            method: '', type: '', color: '', keyword: '',
            fetchXhr: false,
            useRegex: false, caseSensitive: false, invert: false
        } as FilterState,
        sortState: { column: null, direction: 'asc' } as SortState,
        displayedRequests: [] as HarEntry[],
        selectedUid: null as number | null,
        selectedIndex: -1
    }),

    actions: {
        refreshDisplay() {
            const networkStore = useNetworkStore()
            const totalBefore = networkStore.requests.length
            let result = this.getFilteredRequests(networkStore)
            const afterFilter = result.length
            result = this.getSortedRequests(result, networkStore)
            this.displayedRequests = result

            logger.log('刷新显示列表, 总数:', totalBefore, '过滤后:', afterFilter, '排序字段:', this.sortState.column || 'none', this.sortState.direction)

            if (this.selectedUid !== null) {
                this.selectedIndex = result.findIndex(r => r._uid === this.selectedUid)
            } else {
                this.selectedIndex = -1
            }
        },

        getFilteredRequests(networkStore: ReturnType<typeof useNetworkStore>): HarEntry[] {
            const all = networkStore.requests
            const f = this.filterState
            let result = all.slice()
            const hasFilter = f.method || f.type || f.color || f.keyword || f.fetchXhr
            if (!hasFilter && !f.invert) return result

            if (f.method) {
                result = result.filter(r => r.request.method === f.method)
            }
            if (f.type) {
                result = result.filter(r => getResourceCategory(r) === f.type)
            }
            if (f.color === 'none') {
                result = result.filter(r => !networkStore.getRequestMeta(r._uid).color)
            } else if (f.color) {
                result = result.filter(r => networkStore.getRequestMeta(r._uid).color === f.color)
            }
            if (f.keyword) {
                const kw = f.keyword
                const flags = f.caseSensitive ? '' : 'i'
                result = result.filter(r => {
                    const text = r.request.url + ' ' + r.request.method
                    if (f.useRegex) {
                        try { return new RegExp(kw, flags).test(text) } catch { return false }
                    }
                    return f.caseSensitive ? text.includes(kw) : text.toLowerCase().includes(kw.toLowerCase())
                })
            }
            if (f.fetchXhr) {
                result = result.filter(r => r._resourceType === 'fetch' || r._resourceType === 'xhr')
            }
            if (f.invert) {
                const filteredSet = new Set(result)
                result = all.filter(r => !filteredSet.has(r))
            }
            return result
        },

        getSortedRequests(requests: HarEntry[], networkStore: ReturnType<typeof useNetworkStore>): HarEntry[] {
            if (!this.sortState.column) return requests
            const col = this.sortState.column
            const dir = this.sortState.direction === 'asc' ? 1 : -1
            return requests.slice().sort((a, b) => {
                let va: any, vb: any
                switch (col) {
                    case 'index':
                        va = a._uid || 0; vb = b._uid || 0; break
                    case 'color':
                        va = networkStore.getRequestMeta(a._uid).color || ''
                        vb = networkStore.getRequestMeta(b._uid).color || ''
                        break
                    case 'method':
                        va = a.request.method || ''; vb = b.request.method || ''; break
                    case 'host':
                        try { va = new URL(a.request.url).hostname } catch { va = '' }
                        try { vb = new URL(b.request.url).hostname } catch { vb = '' }
                        break
                    case 'url':
                        try { const u = new URL(a.request.url); va = u.pathname + u.search } catch { va = a.request.url }
                        try { const u = new URL(b.request.url); vb = u.pathname + u.search } catch { vb = b.request.url }
                        break
                    case 'status':
                        va = a.response ? a.response.status : 0
                        vb = b.response ? b.response.status : 0
                        break
                    case 'type':
                        va = getResourceCategory(a)
                        vb = getResourceCategory(b)
                        break
                    case 'length':
                        va = (a.response && a.response.content) ? a.response.content.size : 0
                        vb = (b.response && b.response.content) ? b.response.content.size : 0
                        break
                    case 'reqtime':
                        va = a._reqStartTime ? new Date(a._reqStartTime).getTime() : 0
                        vb = b._reqStartTime ? new Date(b._reqStartTime).getTime() : 0
                        break
                    case 'restime':
                        va = a._resEndTime ? new Date(a._resEndTime).getTime() : 0
                        vb = b._resEndTime ? new Date(b._resEndTime).getTime() : 0
                        break
                    case 'time':
                        va = a.time || 0; vb = b.time || 0; break
                    case 'note':
                        va = networkStore.getRequestMeta(a._uid).note || ''
                        vb = networkStore.getRequestMeta(b._uid).note || ''
                        break
                    default: return 0
                }
                if (typeof va === 'string' && typeof vb === 'string') {
                    return dir * va.localeCompare(vb)
                }
                return dir * (va < vb ? -1 : va > vb ? 1 : 0)
            })
        },

        setFilter(key: keyof FilterState, value: any) {
            (this.filterState as any)[key] = value
            this.refreshDisplay()
            logger.log('过滤条件变更:', key, '=', value)
        },

        toggleFilter(key: 'fetchXhr' | 'useRegex' | 'caseSensitive' | 'invert') {
            logger.log('过滤开关切换:', key, '→', !this.filterState[key])
            this.filterState[key] = !this.filterState[key]
            this.refreshDisplay()
        },

        clearFilters() {
            logger.log('清除所有过滤条件')
            this.filterState = {
                method: '', type: '', color: '', keyword: '',
                fetchXhr: false,
                useRegex: false, caseSensitive: false, invert: false
            }
            this.refreshDisplay()
        },

        toggleSort(column: string) {
            let newDir = 'asc'
            if (this.sortState.column === column) {
                if (this.sortState.direction === 'asc') {
                    newDir = 'desc'
                } else {
                    logger.log('排序切换:', column, '→ 取消排序')
                    this.sortState.column = null
                    this.sortState.direction = 'asc'
                    this.refreshDisplay()
                    return
                }
            }
            logger.log('排序切换:', column, newDir)
            this.sortState.column = column
            this.sortState.direction = newDir as 'asc' | 'desc'
            this.refreshDisplay()
        },

        setSelectedUid(uid: number | null) {
            this.selectedUid = uid
            this.refreshDisplay()
        }
    }
})
