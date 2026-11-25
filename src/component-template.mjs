export function vueComponents(ts) {
    const lang = ts ? ' lang="ts"' : '';
    return {
        'src/components/AppButton.vue': '<template><button type="button"><slot /></button></template>\n',
        'src/components/AppCard.vue': '<template><section style="border: 1px solid #ccd6e0; border-radius: 8px; padding: 1rem"><slot /></section></template>\n',
        'src/components/AppLoading.vue': '<template><span role="status"><slot>加载中…</slot></span></template>\n',
        'src/components/AppModal.vue': `<script setup${lang}>
import { ref, watchEffect } from 'vue';

const props = defineProps({ open: Boolean, title: { type: String, required: true } });
const emit = defineEmits(['close']);
const dialog = ref${ts ? '<HTMLDialogElement | null>' : ''}(null);

watchEffect(() => {
    const element = dialog.value;
    if (!element) return;
    if (props.open && !element.open) element.showModal();
    if (!props.open && element.open) element.close();
});
</script>

<template>
    <dialog ref="dialog" :aria-label="title" @cancel.prevent="emit('close')">
        <h2>{{ title }}</h2>
        <slot />
        <button type="button" @click="emit('close')">关闭</button>
    </dialog>
</template>
`,
        'src/components/AppTimer.vue': `<script setup${lang}>
import { onUnmounted, ref } from 'vue';

const seconds = ref(0);
const running = ref(false);
let interval${ts ? ': number | undefined' : ''};

function start() {
    if (running.value) return;
    running.value = true;
    interval = window.setInterval(() => seconds.value++, 1000);
}

function pause() {
    window.clearInterval(interval);
    running.value = false;
}

function reset() {
    pause();
    seconds.value = 0;
}

onUnmounted(pause);
</script>

<template>
    <section aria-label="计时器">
        <p>计时：{{ seconds }} 秒</p>
        <button type="button" :disabled="running" @click="start">开始</button>
        <button type="button" :disabled="!running" @click="pause">暂停</button>
        <button type="button" @click="reset">重置</button>
    </section>
</template>
`,
    };
}

export function reactComponents(ts, classic) {
    const extension = ts ? 'tsx' : 'jsx';
    const children = ts ? ": { children?: ReactNode }" : '';
    const nodeType = ts ? "import type { ReactNode } from 'react';\n" : '';
    return {
        ['src/components/AppButton.' + extension]: classic + (ts ? "import type { ButtonHTMLAttributes } from 'react';\n" : '')
            + 'export function AppButton(props' + (ts ? ': ButtonHTMLAttributes<HTMLButtonElement>' : '') + ') {\n    return <button type="button" {...props} />;\n}\n',
        ['src/components/AppCard.' + extension]: classic + nodeType
            + 'export function AppCard({ children }' + children + ') {\n    return <section style={{ border: "1px solid #ccd6e0", borderRadius: 8, padding: "1rem" }}>{children}</section>;\n}\n',
        ['src/components/AppLoading.' + extension]: classic + nodeType
            + 'export function AppLoading({ children = "加载中…" }' + children + ') {\n    return <span role="status">{children}</span>;\n}\n',
        ['src/components/AppModal.' + extension]: classic + nodeType + `import { useEffect, useRef } from 'react';

export function AppModal({ open, title, onClose, children }${ts ? ': { open: boolean; title: string; onClose: () => void; children?: ReactNode }' : ''}) {
    const dialog = useRef${ts ? '<HTMLDialogElement>' : ''}(null);

    useEffect(() => {
        const element = dialog.current;
        if (!element) return;
        if (open && !element.open) element.showModal();
        if (!open && element.open) element.close();
    }, [open]);

    return (
        <dialog ref={dialog} aria-label={title} onCancel={(event) => { event.preventDefault(); onClose(); }}>
            <h2>{title}</h2>
            {children}
            <button type="button" onClick={onClose}>关闭</button>
        </dialog>
    );
}
`,
        ['src/components/AppTimer.' + extension]: classic + `import { useState } from 'react';
import { useInterval } from '@/hooks/useInterval';

export function AppTimer() {
    const [seconds, setSeconds] = useState(0);
    const [running, setRunning] = useState(false);
    useInterval(() => setSeconds((value) => value + 1), running ? 1000 : null);

    return (
        <section aria-label="计时器">
            <p>计时：{seconds} 秒</p>
            <button type="button" disabled={running} onClick={() => setRunning(true)}>开始</button>
            <button type="button" disabled={!running} onClick={() => setRunning(false)}>暂停</button>
            <button type="button" onClick={() => { setRunning(false); setSeconds(0); }}>重置</button>
        </section>
    );
}
`,
    };
}
