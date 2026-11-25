export function reactHooks(ts) {
    const extension = ts ? 'ts' : 'js';
    const generic = ts ? '<T>' : '';
    return {
        ['src/hooks/useToggle.' + extension]: `import { useCallback, useState } from 'react';

/**
 * 管理布尔开关。
 * @param initial 初始状态，默认为 false。
 * @returns [当前状态, 切换函数, 直接设置状态的函数]。
 */
export function useToggle(initial = false)${ts ? ': [boolean, () => void, (value: boolean) => void]' : ''} {
    const [value, setValue] = useState(initial);
    const toggle = useCallback(() => setValue((current) => !current), []);
    return [value, toggle, setValue];
}
`,
        ['src/hooks/useDebounce.' + extension]: `import { useEffect, useState } from 'react';

/**
 * 在输入停止变化后更新值，可用于搜索框。
 * @param value 要防抖的值。
 * @param delay 等待时长，单位毫秒。
 * @returns 已防抖的值，初次调用返回 value。
 */
export function useDebounce${generic}(value${ts ? ': T' : ''}, delay = 300) {
    const [debounced, setDebounced] = useState(() => value);
    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(() => value), delay);
        return () => window.clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}
`,
        ['src/hooks/useInterval.' + extension]: `import { useEffect, useRef } from 'react';

/**
 * 按间隔调用最新的回调，在卸载或间隔变化时清理定时器。
 * @param callback 到点执行的函数。
 * @param delay 间隔毫秒数，传 null 暂停。
 * @returns 无返回值。
 */
export function useInterval(callback${ts ? ': () => void' : ''}, delay${ts ? ': number | null' : ''}) {
    const latest = useRef(callback);
    useEffect(() => { latest.current = callback; }, [callback]);
    useEffect(() => {
        if (delay === null) return;
        const timer = window.setInterval(() => latest.current(), delay);
        return () => window.clearInterval(timer);
    }, [delay]);
}
`,
        ['src/hooks/useLocalStorage.' + extension]: `import { useEffect, useState } from 'react';

/**
 * 用 localStorage 保存可 JSON 序列化的状态。
 * @param key 存储键，在组件挂载期间保持固定。
 * @param initial 无缓存或读取失败时的默认值。
 * @returns [当前值, React 的状态更新函数]。
 */
export function useLocalStorage${generic}(key${ts ? ': string' : ''}, initial${ts ? ': T' : ''}) {
    const [value, setValue] = useState(() => {
        try {
            const stored = window.localStorage.getItem(key);
            return stored === null ? initial : JSON.parse(stored)${ts ? ' as T' : ''};
        } catch {
            return initial;
        }
    });
    useEffect(() => {
        try { window.localStorage.setItem(key, JSON.stringify(value)); }
        catch { /* 存储不可用时保留当前 React 状态。 */ }
    }, [key, value]);
    return [value, setValue]${ts ? ' as const' : ''};
}
`,
        ['src/hooks/usePrevious.' + extension]: `import { useEffect, useRef } from 'react';

/**
 * 获取上一次提交时的值。
 * @param value 本次渲染的值。
 * @returns 上一次提交的值，首轮为 undefined。
 */
export function usePrevious${generic}(value${ts ? ': T' : ''}) {
    const previous = useRef${ts ? '<T | undefined>' : ''}(undefined);
    useEffect(() => { previous.current = value; }, [value]);
    return previous.current;
}
`,
    };
}
