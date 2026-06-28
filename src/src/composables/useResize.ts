import { ref, onUnmounted } from 'vue'

export function useResize(options: {
    direction: 'horizontal' | 'vertical'
    onResize: (ratio: number) => void
    minRatio?: number
    maxRatio?: number
}) {
    const { direction, onResize, minRatio = 10, maxRatio = 90 } = options
    const isDragging = ref(false)

    let startPos = 0
    let startSizeA = 0
    let startSizeB = 0
    let onMouseMove: ((e: MouseEvent) => void) | null = null
    let onMouseUp: (() => void) | null = null

    function startResize(e: MouseEvent, elA: HTMLElement, elB: HTMLElement) {
        e.preventDefault()
        isDragging.value = true

        if (direction === 'horizontal') {
            startPos = e.clientX
            startSizeA = elA.getBoundingClientRect().width
            startSizeB = elB.getBoundingClientRect().width
        } else {
            startPos = e.clientY
            startSizeA = elA.getBoundingClientRect().height
            startSizeB = elB.getBoundingClientRect().height
        }

        document.body.style.userSelect = 'none'

        onMouseMove = (e: MouseEvent) => {
            if (!isDragging.value) return
            const delta = direction === 'horizontal'
                ? e.clientX - startPos
                : e.clientY - startPos
            const total = startSizeA + startSizeB
            let ratio = ((startSizeA + delta) / total) * 100
            ratio = Math.max(minRatio, Math.min(maxRatio, ratio))
            onResize(ratio)
        }

        onMouseUp = () => {
            isDragging.value = false
            document.body.style.userSelect = ''
            if (onMouseMove) {
                document.removeEventListener('mousemove', onMouseMove)
                onMouseMove = null
            }
            if (onMouseUp) {
                document.removeEventListener('mouseup', onMouseUp)
                onMouseUp = null
            }
        }

        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
    }

    onUnmounted(() => {
        if (onMouseMove) document.removeEventListener('mousemove', onMouseMove)
        if (onMouseUp) document.removeEventListener('mouseup', onMouseUp)
        document.body.style.userSelect = ''
    })

    return { isDragging, startResize }
}
