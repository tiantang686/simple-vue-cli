import { usesClassicReact } from './app-template.mjs';

export function webpackTemplate(options, extension) {
    const { framework, vueVersion, reactVersion, language, css, port } = options;
    const vue = framework === 'vue';
    const legacyVue = vueVersion === '2';
    const typescript = language === 'ts';
    const devDependencies = {
        webpack: '^5.103.0',
        'webpack-cli': '^6.0.0',
        'webpack-dev-server': '^5.2.0',
        'html-webpack-plugin': '^5.6.0',
        'style-loader': '^4.0.0',
        'css-loader': '^7.1.0',
        '@babel/core': '^7.26.0',
        'babel-loader': '^9.2.0',
        ...(vue ? legacyVue ? { 'vue-loader': '^15.11.1', 'vue-template-compiler': '2.7.16' }
            : { 'vue-loader': '^17.4.0', '@vue/compiler-sfc': '^3.5.0' }
            : { '@babel/preset-react': '^7.26.0' }),
        ...(typescript ? { '@babel/preset-typescript': '^7.26.0' } : {}),
        ...(css === 'sass' ? { 'sass-loader': '^16.0.0' } : css === 'less' ? { 'less-loader': '^12.0.0' } : {}),
    };
    const presets = [];
    if (!vue) presets.push(['@babel/preset-react', { runtime: usesClassicReact(reactVersion) ? 'classic' : 'automatic' }]);
    if (typescript) presets.push(vue
        ? ['@babel/preset-typescript', { ignoreExtensions: true }]
        : '@babel/preset-typescript');

    const styleRule = css === 'sass'
        ? "                { test: /\\.s[ac]ss$/, use: ['style-loader', 'css-loader', 'sass-loader'] },\n"
        : css === 'less' ? "                { test: /\\.less$/, use: ['style-loader', 'css-loader', 'less-loader'] },\n" : '';
    const config = `const path = require('node:path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
${vue ? legacyVue ? "const VueLoaderPlugin = require('vue-loader/lib/plugin');\n" : "const { VueLoaderPlugin } = require('vue-loader');\n" : ''}
module.exports = (env, argv) => {
    const mode = env.appMode || argv.mode;
    return {
        entry: './src/main.${extension}',
        output: { path: path.resolve(__dirname, 'dist'), clean: true, filename: '[name].[contenthash].js' },
        resolve: {
            extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue'],
            alias: { '@': path.resolve(__dirname, 'src') },
        },
        module: {
            rules: [
${vue ? "                { test: /\\.vue$/, loader: 'vue-loader' },\n" : ''}                { test: /\\.[jt]sx?$/, exclude: /node_modules/, loader: 'babel-loader',
                    options: { presets: ${JSON.stringify(presets)} }, resolve: { fullySpecified: false } },
                { test: /\\.css$/, use: ['style-loader', 'css-loader'] },
${styleRule}            ],
        },
        plugins: [
            new HtmlWebpackPlugin({ template: './index.html' }),
            new webpack.DefinePlugin({ 'process.env.APP_MODE': JSON.stringify(mode)${vue && !legacyVue ? ', __VUE_OPTIONS_API__: true, __VUE_PROD_DEVTOOLS__: false, __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false' : ''} }),
${vue ? '            new VueLoaderPlugin(),\n' : ''}        ],
        dotenv: { prefix: 'WEBPACK_', template: ['.env', '.env.local', '.env.' + mode, '.env.' + mode + '.local'] },
        devServer: { host: 'localhost', port: ${port}, hot: ${vue}, liveReload: true, historyApiFallback: true },
    };
};
`;
    return {
        scripts: { dev: 'webpack serve --mode development', build: 'webpack --mode production' },
        devDependencies,
        files: { 'webpack.config.cjs': config },
    };
}
