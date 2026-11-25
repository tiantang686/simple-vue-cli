import { reactComponents, vueComponents } from './component-template.mjs';
import { reactHooks } from './hooks-template.mjs';
import { reactPages, vuePages } from './page-template.mjs';
import { requestTemplate } from './request-template.mjs';

export function usesClassicReact(reactVersion) {
    const [major, minor] = reactVersion?.split('.').map(Number) ?? [];
    return major === 16 && minor < 14;
}

export function createAppFiles(options) {
    const { framework, language, vueVersion, reactVersion, router, state, css, bundler } = options;
    const vue = framework === 'vue';
    const legacy = vueVersion === '2';
    const ts = language === 'ts';
    const reactMajor = Number(reactVersion?.split('.')[0]);
    const extension = vue ? language : ts ? 'tsx' : 'jsx';
    const style = css === 'sass' ? 'scss' : css;
    const title = (vue ? 'Vue ' + vueVersion : 'React ' + reactVersion) + ' + ' + (bundler === 'vite' ? 'Vite' : 'Webpack');
    const dependencies = vue ? { vue: legacy ? '2.7.16' : '^3.5.0' } : { react: reactVersion, 'react-dom': reactVersion };
    dependencies.axios = '^1.21.1';
    const accent = css === 'sass' ? '$accent' : css === 'less' ? '@accent' : '#2859af';
    const files = {
        ...requestTemplate(options),
        ['src/pages/home/index.' + style]: (css === 'css' ? '' : accent + ': #2859af;\n')
            + '.home-page { font: 1rem system-ui; margin: 2rem; color: ' + accent + '; }\n.home-page button { margin: 0.25rem; }\n',
        ['src/pages/about/index.' + style]: '.about-page { font: 1rem system-ui; margin: 2rem; }\n.about-page dialog { border: 1px solid #ccd6e0; border-radius: 8px; }\n.about-page dialog::backdrop { background: rgb(0 0 0 / 45%); }\n.about-page section button { margin: 0.25rem; }\n.about-page pre { overflow: auto; }\n',
    };
    const styleImport = "import './index." + style + "';\n";
    if (vue) {
        if (router) dependencies['vue-router'] = legacy ? '^3.6.5' : '^4.5.0';
        if (state === 'pinia') dependencies.pinia = '^3.0.0';
        if (state === 'vuex') dependencies.vuex = legacy ? '^3.6.2' : '^4.1.0';
        if (state === 'pinia') {
            files['src/store.' + language] = "import { defineStore } from 'pinia';\n\nexport const useCounter = defineStore('counter', {\n    state: () => ({ count: 0 }),\n    actions: { increment() { this.count++; } },\n});\n";
        } else if (state === 'vuex') {
            const setup = legacy ? "import Vue from 'vue';\nimport Vuex from 'vuex';\n\nVue.use(Vuex);\n" : "import { createStore } from 'vuex';\n";
            files['src/store.' + language] = setup + '\nexport const store = ' + (legacy ? 'new Vuex.Store' : 'createStore')
                + '({\n    state: { count: 0 },\n    mutations: { increment(state' + (ts ? ': { count: number }' : '') + ') { state.count++; } },\n});\n';
        }
        Object.assign(files, vueComponents(ts), vuePages(options, style));
        const vueImports = legacy ? "import Vue from 'vue';\n" : "import { createApp } from 'vue';\n";
        const routerImports = router ? "import { router } from '@/router';\n" : '';
        const stateImports = state === 'pinia' ? "import { createPinia } from 'pinia';\n"
            : state === 'vuex' ? "import { store } from '@/store';\n" : '';
        const mount = legacy
            ? 'new Vue({ ' + (router ? 'router, ' : '') + (state === 'vuex' ? 'store, ' : '') + "render: h => h(App) }).$mount('#app');\n"
            : 'const app = createApp(App);\n'
                + (router ? 'app.use(router);\n' : '') + (state === 'pinia' ? 'app.use(createPinia());\n' : state === 'vuex' ? 'app.use(store);\n' : '') + "app.mount('#app');\n";
        files['src/main.' + extension] = vueImports + routerImports + stateImports
            + "import App from '@/App.vue';\n\n" + mount;
        const counter = state === 'pinia'
            ? "import { useCounter } from '@/store';\nimport { computed } from 'vue';\n\nconst store = useCounter();\nconst count = computed(() => store.count);\nconst increment = () => store.increment();"
            : state === 'vuex'
                ? "import { store } from '@/store';\nimport { computed } from 'vue';\n\nconst count = computed(() => store.state.count);\nconst increment = () => store.commit('increment');"
                : "import { ref } from 'vue';\n\nconst count = ref(0);\nconst increment = () => count.value++;";
        files['src/pages/home/index.vue'] = '<script setup' + (ts ? ' lang="ts"' : '') + '>\n'
            + "import AppTimer from '@/components/AppTimer.vue';\n" + styleImport + '\n' + counter
            + '\n</script>\n\n<template>\n    <main class="home-page">\n        <h1>' + title + '</h1>\n        <button type="button" @click="increment">Count: {{ count }}</button>\n        <AppTimer />\n    </main>\n</template>\n';
    } else {
        if (router) dependencies['react-router-dom'] = '^6.30.0';
        if (state === 'redux') {
            dependencies['@reduxjs/toolkit'] = reactMajor >= 18 ? '^2.0.0' : '^1.9.7';
            dependencies['react-redux'] = reactMajor >= 18 ? '^9.2.0' : '^8.1.3';
            files['src/store.' + language] = "import { configureStore, createSlice } from '@reduxjs/toolkit';\n\nconst counter = createSlice({\n    name: 'counter',\n    initialState: { count: 0 },\n    reducers: { increment(state) { state.count++; } },\n});\n\nexport const { increment } = counter.actions;\nexport const store = configureStore({ reducer: counter.reducer });\n"
                + (ts ? 'export type RootState = ReturnType<typeof store.getState>;\n' : '');
        } else if (state === 'zustand') {
            dependencies.zustand = reactMajor >= 18 ? '^5.0.0' : '^4.5.0';
            files['src/store.' + language] = "import { create } from 'zustand';\n\n"
                + (ts ? 'type Counter = { count: number; increment: () => void };\n\n' : '')
                + 'export const useCounter = create' + (ts ? '<Counter>()' : '') + '((set) => ({\n    count: 0,\n    increment: () => set((state) => ({ count: state.count + 1 })),\n}));\n';
        }
        const classic = usesClassicReact(reactVersion) ? "import React from 'react';\n" : '';
        Object.assign(files, reactComponents(ts, classic), reactHooks(ts), reactPages(options, extension, classic, style));
        const counterImports = state === 'redux' ? "import { useDispatch, useSelector } from 'react-redux';\nimport { increment } from '@/store';\n"
            + (ts ? "import type { RootState } from '@/store';\n" : '')
            : state === 'zustand' ? "import { useCounter } from '@/store';\n" : "import { useState } from 'react';\n";
        const counter = state === 'redux' ? 'const count = useSelector((state' + (ts ? ': RootState' : '') + ') => state.count);\n    const dispatch = useDispatch();\n    const add = () => dispatch(increment());'
            : state === 'zustand' ? 'const count = useCounter((state) => state.count);\n    const add = useCounter((state) => state.increment);'
                : 'const [count, setCount] = useState(0);\n    const add = () => setCount((value) => value + 1);';
        let root = '<App />';
        if (state === 'redux') root = '<Provider store={store}>' + root + '</Provider>';
        const mount = reactMajor >= 18 ? 'createRoot(container).render(' + root + ');' : 'ReactDOM.render(' + root + ', container);';
        files['src/pages/home/index.' + extension] = classic + counterImports + "import { AppTimer } from '@/components/AppTimer';\n" + styleImport
            + '\nexport default function HomePage() {\n    ' + counter + '\n    return (\n        <main className="home-page">\n            <h1>' + title + '</h1>\n            <button type="button" onClick={add}>Count: {count}</button>\n            <AppTimer />\n        </main>\n    );\n}\n';
        files['src/main.' + extension] = classic
            + (reactMajor >= 18 ? "import { createRoot } from 'react-dom/client';\n" : "import ReactDOM from 'react-dom';\n")
            + (state === 'redux' ? "import { Provider } from 'react-redux';\nimport { store } from '@/store';\n" : '')
            + "import { App } from '" + (router ? '@/router' : '@/App') + "';\n\n"
            + "const container = document.getElementById('app');\nif (!container) throw new Error('Missing app container');\n" + mount + '\n';
    }
    return { dependencies, files, extension };
}
