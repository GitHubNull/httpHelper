/**
 * 调试日志工具模块
 *
 * 通过 popup 页面中的开关控制是否在 DevTools 控制台输出详细调试信息。
 * 调试状态持久化到 chrome.storage.local，所有扩展页面共享同一状态。
 *
 * 使用方式:
 *   import { createLogger } from '@/utils/debug-logger'
 *   const logger = createLogger('network')
 *   logger.log('请求捕获:', url)
 */

const STORAGE_KEY = 'httpHelper_debugMode'

// ============ 调试状态管理 ============

/** 内存缓存，避免每次日志调用都异步查询。
 * 初始值设为 true 以避免初始化竞态：各 store 在模块顶层调用 createLogger()
 * 早于 chrome.storage.local 异步回调完成，若默认为 false 会导致早期日志静默丢失。
 * 异步回调完成后（通常仅数毫秒）会自动修正为存储中的实际值。 */
let _debugEnabled = true

/** 初始化完成的 Promise */
let _initPromise: Promise<void> | null = null

/**
 * 从 chrome.storage.local 加载初始状态并监听变更
 */
function initDebugState(): Promise<void> {
    if (_initPromise) return _initPromise

    _initPromise = new Promise<void>((resolve) => {
        // 读取初始状态
        chrome.storage.local.get([STORAGE_KEY], (result) => {
            _debugEnabled = !!result[STORAGE_KEY]
            resolve()
        })
    })

    // 监听其他页面（popup/panel）的状态变更
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && STORAGE_KEY in changes) {
            _debugEnabled = !!changes[STORAGE_KEY].newValue
        }
    })

    return _initPromise
}

/** 确保状态已初始化 */
function ensureInit(): Promise<void> {
    return initDebugState()
}

/**
 * 获取当前调试模式是否启用
 */
export function isDebugEnabled(): boolean {
    return _debugEnabled
}

/**
 * 设置调试模式状态并持久化
 */
export async function setDebugEnabled(enabled: boolean): Promise<void> {
    _debugEnabled = enabled
    await chrome.storage.local.set({ [STORAGE_KEY]: enabled })
}

/**
 * 等待初始化完成后获取调试模式状态
 */
export async function isDebugEnabledAsync(): Promise<boolean> {
    await ensureInit()
    return _debugEnabled
}

// ============ Logger 实现 ============

export interface DebugLogger {
    /** 普通日志 */
    log(...args: unknown[]): void
    /** 警告日志 */
    warn(...args: unknown[]): void
    /** 错误日志（始终输出，不受调试模式控制） */
    error(...args: unknown[]): void
    /** 分组开始 */
    group(label: string): void
    /** 分组结束 */
    groupEnd(): void
    /** 计时开始 */
    time(label: string): void
    /** 计时结束 */
    timeEnd(label: string): void
    /** 获取当前模块名 */
    readonly moduleName: string
}

/**
 * 获取带时间戳的日志前缀
 * 格式: [http helper][模块名][HH:MM:SS.sss]
 */
function getPrefix(moduleName: string): string {
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const ss = String(now.getSeconds()).padStart(2, '0')
    const mmm = String(now.getMilliseconds()).padStart(3, '0')
    return `[http helper][${moduleName}][${hh}:${mm}:${ss}.${mmm}]`
}

/**
 * 创建一个带模块标识的调试 logger
 * @param moduleName 模块名称，用于日志标识
 */
export function createLogger(moduleName: string): DebugLogger {
    // 初始化状态（异步但不阻塞返回）
    ensureInit()

    function prefix(): string {
        return getPrefix(moduleName)
    }

    const logger: DebugLogger = {
        moduleName,

        log(...args: unknown[]): void {
            if (!_debugEnabled) return
            console.log(prefix(), ...args)
        },

        warn(...args: unknown[]): void {
            if (!_debugEnabled) return
            console.warn(prefix(), ...args)
        },

        error(...args: unknown[]): void {
            // 错误日志始终输出，便于排查严重问题
            console.error(prefix(), ...args)
        },

        group(label: string): void {
            if (!_debugEnabled) return
            console.group(prefix() + ' ' + label)
        },

        groupEnd(): void {
            if (!_debugEnabled) return
            console.groupEnd()
        },

        time(label: string): void {
            if (!_debugEnabled) return
            console.time(prefix() + ' ' + label)
        },

        timeEnd(label: string): void {
            if (!_debugEnabled) return
            console.timeEnd(prefix() + ' ' + label)
        }
    }

    return logger
}

// ============ 全局便捷方法 ============

/**
 * 调试日志（无模块标识），用于简单场景
 */
export function debugLog(...args: unknown[]): void {
    if (!_debugEnabled) return
    console.log(getPrefix('global'), ...args)
}

/**
 * 初始化调试状态监听（在应用入口调用，确保 popup 的变更能被 panel 感知）
 */
export function initDebugModeListener(): void {
    ensureInit()
}
