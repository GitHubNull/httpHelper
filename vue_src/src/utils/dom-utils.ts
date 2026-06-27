export interface SearchMatch {
    start: number
    end: number
}

export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): (...args: Parameters<T>) => void {
    let timer: ReturnType<typeof setTimeout> | null = null
    return function(this: any, ...args: Parameters<T>) {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => fn.apply(this, args), delay)
    }
}

export function updateLineNumbers(textarea: HTMLTextAreaElement | null, lineNumbersEl: HTMLElement | null, content?: string): void {
    if (!textarea || !lineNumbersEl) return
    const text = content !== undefined ? content : textarea.value
    const lines = text.split('\n').length
    let html = ''
    for (let i = 1; i <= lines; i++) {
        html += i + '\n'
    }
    lineNumbersEl.textContent = html
    lineNumbersEl.scrollTop = textarea.scrollTop
}

export function highlightOverlay(
    overlay: HTMLDivElement | null,
    text: string,
    matches: SearchMatch[],
    currentIndex: number = -1
): void {
    if (!overlay) return
    if (!text || matches.length === 0) {
        overlay.innerHTML = escapeHtmlForOverlay(text)
        return
    }
    let html = ''
    let lastEnd = 0
    for (let i = 0; i < matches.length; i++) {
        const m = matches[i]
        html += escapeHtmlForOverlay(text.substring(lastEnd, m.start))
        const matchText = escapeHtmlForOverlay(text.substring(m.start, m.end))
        if (i === currentIndex) {
            html += `<mark class="search-highlight search-highlight-current">${matchText}</mark>`
        } else {
            html += `<mark class="search-highlight">${matchText}</mark>`
        }
        lastEnd = m.end
    }
    html += escapeHtmlForOverlay(text.substring(lastEnd))
    overlay.innerHTML = html
}

export function clearOverlay(overlay: HTMLDivElement | null): void {
    if (!overlay) return
    overlay.innerHTML = ''
}

function escapeHtmlForOverlay(text: string): string {
    if (!text) return ''
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}
