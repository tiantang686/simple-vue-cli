import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function createWebpackProject(directory, name, framework, language) {
    const vue = framework === 'vue';
    const typescript = language === 'ts';
    const extension = vue ? language : typescript ? 'tsx' : 'jsx';
    const dependencies = vue ? { vue: '^3.5.0' } : { react: '^19.0.0', 'react-dom': '^19.0.0' };
    const devDependencies = {
        webpack: '^5.103.0',
        'webpack-cli': '^6.0.0',
        'webpack-dev-server': '^5.2.0',
        'html-webpack-plugin': '^5.6.0',
        'style-loader': '^4.0.0',
        'css-loader': '^7.1.0',
        '@babel/core': '^7.26.0',
        'babel-loader': '^9.2.0',
        ...(vue ? { 'vue-loader': '^17.4.0', '@vue/compiler-sfc': '^3.5.0' }
            : { '@babel/preset-react': '^7.26.0' }),
        ...(typescript ? { '@babel/preset-typescript': '^7.26.0', typescript: '^5.9.0',
            ...(vue ? { 'vue-tsc': '^3.0.0' } : { '@types/react': '^19.0.0', '@types/react-dom': '^19.0.0' }) } : {}),
    };
    const scripts = {
        dev: 'webpack serve --mode development',
        build: 'webpack --mode production',
        ...(typescript ? { typecheck: vue ? 'vue-tsc --noEmit' : 'tsc --noEmit' } : {}),
    };
    const presets = [];
    if (!vue) presets.push(['@babel/preset-react', { runtime: 'automatic' }]);
    if (typescript) presets.push(vue
        ? ['@babel/preset-typescript', { ignoreExtensions: true }]
        : '@babel/preset-typescript');

    const config = `const path = require('node:path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
${vue ? "const { VueLoaderPlugin } = require('vue-loader');\n" : ''}
module.exports = (env, argv) => {
    const mode = env.appMode || argv.mode;
    return {
        entry: './src/main.${extension}',
        output: { path: path.resolve(__dirname, 'dist'), clean: true, filename: '[name].[contenthash].js' },
        resolve: { extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue'] },
        module: {
            rules: [
${vue ? "                { test: /\\.vue$/, loader: 'vue-loader' },\n" : ''}                { test: /\\.[jt]sx?$/, exclude: /node_modules/, loader: 'babel-loader',
                    options: { presets: ${JSON.stringify(presets)} } },
                { test: /\\.css$/, use: ['style-loader', 'css-loader'] },
            ],
        },
        plugins: [
            new HtmlWebpackPlugin({ template: './index.html' }),
            new webpack.DefinePlugin({ 'process.env.APP_MODE': JSON.stringify(mode)${vue ? ', __VUE_OPTIONS_API__: true, __VUE_PROD_DEVTOOLS__: false, __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false' : ''} }),
${vue ? '            new VueLoaderPlugin(),\n' : ''}        ],
        dotenv: { prefix: 'WEBPACK_', template: ['.env', '.env.local', '.env.' + mode, '.env.' + mode + '.local'] },
        devServer: { host: 'localhost', port: 5173, hot: ${vue}, liveReload: true, historyApiFallback: true },
    };
};
`;
    const main = vue
        ? `import { createApp } from 'vue';\nimport App from './App.vue';\n\ncreateApp(App).mount('#app');\n`
        : `import { useState } from 'react';\nimport { createRoot } from 'react-dom/client';\n\nfunction App() {\n    const [count, setCount] = useState${typescript ? '<number>' : ''}(0);\n    return <main><h1>React + Webpack</h1><button onClick={() => setCount(count + 1)}>Count: {count}</button></main>;\n}\n\ncreateRoot(document.getElementById('app')${typescript ? '!' : ''}).render(<App />);\n`;
    const files = {
        'package.json': JSON.stringify({ name, version: '0.0.0', private: true, scripts, dependencies, devDependencies }, null, 2) + '\n',
        'webpack.config.cjs': config,
        'index.html': `<!doctype html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1">\n    <title>${name}</title>\n</head>\n<body>\n    <div id="app"></div>\n</body>\n</html>\n`,
        '.gitignore': 'node_modules/\ndist/\n.env.local\n.env.*.local\n',
        [`src/main.${extension}`]: main,
    };
    if (vue) files['src/App.vue'] = `<script setup${typescript ? ' lang="ts"' : ''}>\nimport { ref } from 'vue';\n\nconst count = ref${typescript ? '<number>' : ''}(0);\n</script>\n\n<template>\n    <main>\n        <h1>Vue + Webpack</h1>\n        <button @click="count++">Count: {{ count }}</button>\n    </main>\n</template>\n`;
    if (typescript) {
        files['tsconfig.json'] = JSON.stringify({
            compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler',
                strict: true, noEmit: true, types: [], ...(vue ? {} : { jsx: 'react-jsx' }) },
            include: ['src'],
        }, null, 2) + '\n';
        files['src/env.d.ts'] = 'declare const process: {\n    readonly env: {\n        readonly APP_MODE: string;\n        readonly [name: `WEBPACK_${string}`]: string | undefined;\n    };\n};\n';
    }

    mkdirSync(join(directory, 'src'));
    for (const [file, content] of Object.entries(files)) writeFileSync(join(directory, file), content);
}
