import { createInterface } from 'node:readline/promises';

export function parsePort(value) {
    if (!/^\d+$/.test(String(value)) || Number(value) < 1 || Number(value) > 65535) {
        throw new Error('端口号必须是 1 至 65535 之间的整数。');
    }
    return Number(value);
}

function parseReactVersion(value) {
    const match = /^(16|17|18|19)\.(\d+)\.(0|[1-9]\d*)$/.exec(value);
    if (!match || (match[1] === '16' && Number(match[2]) < 9) || /^0\d/.test(match[2])) {
        throw new Error('请输入完整的 React 稳定版本号，支持 16.9.0 至 19.x，例如 18.3.1。');
    }
    return value;
}

export async function selectProjectOptions(options) {
    const [templateFramework, templateLanguage] = options.template?.split('-') ?? [];
    const languageFromTemplate = options.template ? templateLanguage ?? 'js' : undefined;
    if ((templateFramework && options.framework && options.framework !== templateFramework)
        || (languageFromTemplate && options.language && options.language !== languageFromTemplate)) {
        throw new Error('--template 与 --framework 或 --language 选项冲突。');
    }

    const interactive = process.stdin.isTTY && process.stdout.isTTY && options.interactive;
    const prompt = interactive ? createInterface({ input: process.stdin, output: process.stdout }) : undefined;
    prompt?.on('SIGINT', () => { console.log('\n已取消初始化。'); process.exit(130); });

    async function ask(value, label, fallback, parse) {
        if (value !== undefined || !prompt) return parse(value ?? fallback);
        while (true) {
            const answer = (await prompt.question(`${label} [${fallback}]：`)).trim();
            try { return parse(answer || fallback); }
            catch (error) { console.log(error.message); }
        }
    }

    function choose(value, label, choices) {
        const menu = choices.map((choice, index) => `${index + 1}. ${choice}`).join(' / ');
        return ask(value, `${label}（${menu}）`, choices[0], answer => {
            const choice = choices.find((item, index) => item === answer.toLowerCase() || String(index + 1) === answer);
            if (!choice) throw new Error(`可选值：${choices.join('、')}`);
            return choice;
        });
    }

    try {
        const framework = await choose(options.framework ?? templateFramework, '框架', ['vue', 'react']);
        const language = await choose(options.language ?? languageFromTemplate, '语言', ['js', 'ts']);
        const bundler = await choose(options.bundler, '构建工具', ['vite', 'webpack']);
        if ((framework === 'vue' && options.reactVersion) || (framework === 'react' && options.vueVersion)) {
            throw new Error('框架版本参数须与所选框架一致。');
        }
        const vueVersion = framework === 'vue' ? await choose(options.vueVersion, 'Vue 主版本', ['3', '2']) : undefined;
        const reactVersion = framework === 'react' ? await ask(options.reactVersion, 'React 版本', '19.3.1', parseReactVersion) : undefined;
        const router = (await choose(options.router, framework === 'vue' ? '启用 Vue Router' : '启用 React Router', ['no', 'yes'])) === 'yes';
        const states = framework === 'react' ? ['redux', 'zustand', 'none'] : vueVersion === '2' ? ['none', 'vuex'] : ['none', 'pinia', 'vuex'];
        const state = await choose(options.state, '状态管理', states);
        const css = await choose(options.css, 'CSS 预处理器', ['css', 'sass', 'less']);
        const quality = await choose(options.quality, '检查和格式化', ['both', 'eslint', 'prettier', 'none']);
        const port = await ask(options.port, '开发服务器端口', '5173', parsePort);
        return { framework, language, bundler, vueVersion, reactVersion, router, state, css, quality, port };
    } finally {
        prompt?.close();
    }
}
