import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createAppFiles, usesClassicReact } from './app-template.mjs';
import { webpackTemplate } from './webpack-template.mjs';

function viteTemplate(options, extension) {
    const { framework, vueVersion, reactVersion, language, port, css } = options;
    const plugin = framework === 'react' ? '@vitejs/plugin-react' : vueVersion === '2' ? '@vitejs/plugin-vue2' : '@vitejs/plugin-vue';
    const pluginVersion = framework === 'react' ? '^5.0.0' : vueVersion === '2' ? '^2.3.4' : '^6.0.0';
    const config = `import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import frameworkPlugin from '${plugin}';

export default defineConfig(({ command, mode }) => {
    const env = loadEnv(mode, process.cwd(), 'VITE_');
    const serving = command === 'serve';
    return {
        base: env.VITE_BASE || '/',
        plugins: [frameworkPlugin(${usesClassicReact(reactVersion) ? "{ jsxRuntime: 'classic' }" : ''})],
        resolve: {
            alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
        },
        server: {
            host: 'localhost',
            port: ${port},
            strictPort: true,
            open: false,
            // proxy: { '/api': 'http://localhost:3000' },
        },
        define: {
            __APP_MODE__: JSON.stringify(mode),
        },
        css: {
            devSourcemap: serving,${css === 'sass' ? "\n            preprocessorOptions: { scss: { api: 'modern-compiler' } }," : css === 'less' ? '\n            preprocessorOptions: { less: { javascriptEnabled: false } },' : ''}
        },
        build: {
            outDir: 'dist',
            assetsDir: 'assets',
            sourcemap: !serving && mode === 'development',
            minify: mode === 'development' ? false : 'esbuild',
            target: 'es2020',
        },
    };
});
`;
    return {
        scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
        devDependencies: { vite: '^7.0.0', [plugin]: pluginVersion },
        files: {
            ['vite.config.' + language]: config,
            '.env.example': '# VITE_BASE=/my-app/\n',
        },
        script: '<script type="module" src="/src/main.' + extension + '"></script>',
    };
}

function addQualityTools(options, devDependencies, scripts, files) {
    const { quality, framework, vueVersion, reactVersion, language } = options;
    if (quality === 'eslint' || quality === 'both') {
        const vue = framework === 'vue';
        const ts = language === 'ts';
        Object.assign(devDependencies, { eslint: '^9.0.0', '@eslint/js': '^9.0.0', globals: '^16.0.0' });
        if (vue) devDependencies['eslint-plugin-vue'] = '^10.0.0';
        else devDependencies['eslint-plugin-react'] = '^7.37.5';
        if (ts) devDependencies['typescript-eslint'] = '^8.0.0';
        scripts.lint = 'eslint src';
        files['eslint.config.mjs'] = "import js from '@eslint/js';\nimport globals from 'globals';\n"
            + (vue ? "import vue from 'eslint-plugin-vue';\n" : '')
            + (!vue ? "import react from 'eslint-plugin-react';\n" : '')
            + (ts ? "import tseslint from 'typescript-eslint';\n" : '')
            + '\nexport default [\n    js.configs.recommended,\n'
            + (ts ? '    ...tseslint.configs.recommended,\n' : '')
            + (vue ? "    ...vue.configs['flat/" + (vueVersion === '2' ? 'vue2-' : '') + "essential'],\n" : '')
            + "    { files: ['src/**/*.{js,jsx,ts,tsx,vue}'], languageOptions: { globals: globals.browser } },\n"
            + (!vue ? "    { files: ['**/*.{jsx,tsx}'], languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },\n"
                + "      plugins: { react }, rules: { 'react/jsx-uses-vars': 'error'"
                + (usesClassicReact(reactVersion) ? ", 'react/jsx-uses-react': 'error'" : '') + ' } },\n' : '')
            + (vue && ts ? "    { files: ['**/*.vue'], languageOptions: { parserOptions: { parser: tseslint.parser } } },\n" : '')
            + "    { files: ['**/*.{js,ts,tsx,jsx,vue}'], languageOptions: { globals: { __APP_MODE__: 'readonly', process: 'readonly' } } },\n];\n";
    }
    if (quality === 'prettier' || quality === 'both') {
        devDependencies.prettier = '^3.0.0';
        scripts.format = 'prettier --write .';
        scripts['format:check'] = 'prettier --check .';
        files['.prettierrc.json'] = '{ "singleQuote": true, "tabWidth": 4 }\n';
        files['.prettierignore'] = 'dist/\npackage-lock.json\n';
    }
}

export function createProject(directory, name, options) {
    const { framework, language, bundler, vueVersion, reactVersion, css, state } = options;
    const { dependencies, files, extension } = createAppFiles(options);
    const template = bundler === 'vite' ? viteTemplate(options, extension) : webpackTemplate(options, extension);
    const { scripts, devDependencies } = template;
    Object.assign(files, template.files);
    if (css === 'sass') devDependencies['sass-embedded'] = '^1.89.0';
    if (css === 'less') devDependencies.less = '^4.2.0';

    if (language === 'ts') {
        const legacyVue = vueVersion === '2';
        devDependencies.typescript = legacyVue ? '~5.2.2' : '~5.9.3';
        if (framework === 'vue') devDependencies['vue-tsc'] = legacyVue ? '1.8.27' : '^3.0.0';
        else {
            const major = reactVersion.split('.')[0];
            devDependencies['@types/react'] = '^' + major + '.0.0';
            devDependencies['@types/react-dom'] = '^' + major + '.0.0';
        }
        scripts.typecheck = (framework === 'vue' ? 'vue-tsc' : 'tsc') + ' --noEmit';
        files['tsconfig.json'] = JSON.stringify({
            compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler',
                strict: true, noEmit: true, skipLibCheck: true, types: bundler === 'vite' ? ['vite/client'] : [],
                paths: { '@/*': ['./src/*'], ...(state === 'vuex' ? { vuex: ['./node_modules/vuex/types/index.d.ts'] } : {}) },
                ...(framework === 'react' ? { jsx: usesClassicReact(reactVersion) ? 'react' : 'react-jsx' } : {}) },
            ...(legacyVue ? { vueCompilerOptions: { target: 2.7 } } : {}),
            include: ['src'],
        }, null, 4) + '\n';
        files['src/env.d.ts'] = bundler === 'vite' ? 'declare const __APP_MODE__: string;\n'
            : 'declare const process: {\n    readonly env: {\n        readonly APP_MODE: string;\n        readonly [name: `WEBPACK_${string}`]: string | undefined;\n    };\n};\n';
        if (bundler === 'webpack') files['src/env.d.ts'] += "declare module '*.css';\ndeclare module '*.scss';\ndeclare module '*.less';\n";
    }
    addQualityTools(options, devDependencies, scripts, files);
    files['package.json'] = JSON.stringify({ name, version: '0.0.0', private: true,
        type: 'module', scripts, dependencies, devDependencies }, null, 4) + '\n';
    files['index.html'] = '<!doctype html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1">\n    <title>' + name + '</title>\n</head>\n<body>\n    <div id="app"></div>\n    ' + (template.script ?? '') + '\n</body>\n</html>\n';
    files['.gitignore'] = 'node_modules/\ndist/\n.env.local\n.env.*.local\n';
    if (language === 'js') files['jsconfig.json'] = JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } }, include: ['src'] }, null, 4) + '\n';
    mkdirSync(join(directory, 'src'));
    for (const [file, content] of Object.entries(files)) writeFileSync(join(directory, file), content);
}
