import { aboutRequests } from './about-requests-template.mjs';

export function vuePages({ router, language, vueVersion }, style) {
    const lang = language === 'ts' ? ' lang="ts"' : '';
    const legacy = vueVersion === '2';
    const imports = ['AppButton', 'AppCard', 'AppModal', 'AppLoading'].map((name) => "import " + name + " from '@/components/" + name + ".vue';").join('\n');
    const files = {
        'src/App.vue': `<script setup${lang}>
${router ? legacy ? '' : "import { RouterLink, RouterView } from 'vue-router';" : "import { ref } from 'vue';\nimport HomePage from '@/pages/home/index.vue';\nimport AboutPage from '@/pages/about/index.vue';\n\nconst about = ref(false);"}
</script>

<template>
    <div>
        <nav aria-label="页面导航">
            ${router ? '<RouterLink to="/">Home</RouterLink> · <RouterLink to="/about">About</RouterLink>' : '<button type="button" @click="about = false">Home</button>\n            <button type="button" @click="about = true">About</button>'}
        </nav>
        ${router ? '<RouterView />' : '<AboutPage v-if="about" />\n        <HomePage v-else />'}
    </div>
</template>
`,
        ['src/pages/about/requests.' + language]: aboutRequests(language),
        'src/pages/about/index.vue': `<script setup${lang}>
import { onUnmounted, ref } from 'vue';
${imports}
import { createRequestRunner, requestExamples } from './requests';
import './index.${style}';

const open = ref(false);
const requestState = ref({ loading: false, message: '' });
const { run, cancel } = createRequestRunner((state) => { requestState.value = state; });
onUnmounted(cancel);
</script>

<template>
    <main class="about-page">
        <h1>About</h1>
        <AppCard>
            <p>这是脚手架的关于页。</p>
            <AppButton @click${legacy ? '.native' : ''}="open = true">打开弹窗</AppButton>
        </AppCard>
        <AppModal :open="open" title="示例弹窗" @close="open = false">
            <p>可使用关闭按钮或 Esc 关闭。</p>
        </AppModal>
        <section aria-label="网络请求示例">
            <h2>网络请求示例</h2>
            <button v-for="example in requestExamples" :key="example.label" type="button"
                :disabled="requestState.loading" @click="run(example.run)">{{ example.label }}</button>
            <AppLoading v-if="requestState.loading" />
            <pre v-else aria-live="polite">{{ requestState.message }}</pre>
        </section>
    </main>
</template>
`,
    };
    if (router) files['src/router/index.' + language] = (legacy
        ? "import Vue from 'vue';\nimport VueRouter from 'vue-router';\n"
        : "import { createRouter, createWebHashHistory } from 'vue-router';\n")
        + "\nconst routes = [\n    { path: '/', name: 'home', component: () => import('@/pages/home/index.vue') },\n    { path: '/about', name: 'about', component: () => import('@/pages/about/index.vue') },\n];\n\n"
        + (legacy ? 'Vue.use(VueRouter);\nexport const router = new VueRouter({ routes });\n'
            : 'export const router = createRouter({ history: createWebHashHistory(), routes });\n');
    return files;
}

export function reactPages({ router, language }, extension, classic, style) {
    const navigation = router
        ? "import { lazy, Suspense } from 'react';\nimport { HashRouter, Link, Route, Routes } from 'react-router-dom';\nimport { AppLoading } from '@/components/AppLoading';\n\n"
            + "const HomePage = lazy(() => import('@/pages/home'));\nconst AboutPage = lazy(() => import('@/pages/about'));\n\n"
        : "import { useState } from 'react';\nimport HomePage from '@/pages/home';\nimport AboutPage from '@/pages/about';\n\n";
    const files = {
        ['src/pages/about/requests.' + language]: aboutRequests(language),
        ['src/pages/about/index.' + extension]: classic + `import { useEffect, useMemo, useState } from 'react';
import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppLoading } from '@/components/AppLoading';
import { AppModal } from '@/components/AppModal';
import { useToggle } from '@/hooks/useToggle';
import { createRequestRunner, requestExamples } from './requests';
import './index.${style}';

export default function AboutPage() {
    const [open, , setOpen] = useToggle();
    const [requestState, setRequestState] = useState({ loading: false, message: '' });
    const { run, cancel } = useMemo(() => createRequestRunner(setRequestState), []);
    useEffect(() => cancel, [cancel]);
    return (
        <main className="about-page">
            <h1>About</h1>
            <AppCard>
                <p>这是脚手架的关于页。</p>
                <AppButton onClick={() => setOpen(true)}>打开弹窗</AppButton>
            </AppCard>
            <AppModal open={open} title="示例弹窗" onClose={() => setOpen(false)}>
                <p>可使用关闭按钮或 Esc 关闭。</p>
            </AppModal>
            <section aria-label="网络请求示例">
                <h2>网络请求示例</h2>
                {requestExamples.map((example) => (
                    <AppButton key={example.label} disabled={requestState.loading} onClick={() => run(example.run)}>
                        {example.label}
                    </AppButton>
                ))}
                {requestState.loading ? <AppLoading /> : <pre aria-live="polite">{requestState.message}</pre>}
            </section>
        </main>
    );
}
`,
    };
    const root = classic + navigation
        + (router ? `export function App() {
    return (
        <HashRouter>
            <nav aria-label="页面导航"><Link to="/">Home</Link> · <Link to="/about">About</Link></nav>
            <Suspense fallback={<AppLoading />}>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/about" element={<AboutPage />} />
                </Routes>
            </Suspense>
        </HashRouter>
    );
}
` : `export function App() {
    const [about, setAbout] = useState(false);
    return (
        <>
            <nav aria-label="页面导航">
                <button type="button" onClick={() => setAbout(false)}>Home</button>
                <button type="button" onClick={() => setAbout(true)}>About</button>
            </nav>
            {about ? <AboutPage /> : <HomePage />}
        </>
    );
}
`);
    files[router ? 'src/router/index.' + extension : 'src/App.' + extension] = root;
    return files;
}
