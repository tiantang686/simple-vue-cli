import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command, Option } from 'commander';
import { parsePort, selectProjectOptions } from './project-options.mjs';
import { createProject } from './project-template.mjs';

const packageFile = fileURLToPath(new URL('../package.json', import.meta.url));
const { version } = JSON.parse(readFileSync(packageFile, 'utf8'));
const configFile = '.simple-cli.json';
const program = new Command();

function runNpm(args, cwd = process.cwd()) {
    const windows = process.platform === 'win32';
    const npmCli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
    const command = windows ? process.execPath : 'npm';
    const result = spawnSync(command, windows ? [npmCli, ...args] : args, {
        cwd,
        stdio: 'inherit',
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
        process.exitCode = result.status ?? (result.signal === 'SIGINT' ? 130 : 1);
        return false;
    }
    return true;
}

function validateMode(mode) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(mode) || mode === 'local') {
        throw new Error('无效的模式名，请使用 development、production、staging 等名称。');
    }
    return mode;
}

function projectConfig() {
    if (!existsSync(configFile)) throw new Error('请先进入 simple-cli init 创建的项目目录。');
    return JSON.parse(readFileSync(configFile, 'utf8'));
}

function runProject(script, defaultMode, options) {
    const config = projectConfig();
    const mode = validateMode(options.mode ?? config.mode ?? defaultMode);
    const args = ['run', script, '--'];
    if (config.bundler === 'webpack') args.push('--env', `appMode=${mode}`);
    else args.push('--mode', mode);
    if (options.host !== undefined) args.push('--host', options.host);
    if (options.port !== undefined) args.push('--port', String(parsePort(options.port)));
    runNpm(args);
}

program.name('simple-cli').description('创建、开发和构建 Vue 或 React 项目').version(version);

program.command('init <name>')
    .description('选择框架、语言和构建工具，创建项目并安装依赖')
    .addOption(new Option('-t, --template <template>', '一次指定框架和语言')
        .choices(['vue', 'react', 'vue-ts', 'react-ts']))
    .addOption(new Option('-f, --framework <framework>', '项目框架').choices(['vue', 'react']))
    .addOption(new Option('-l, --language <language>', '源码语言').choices(['js', 'ts']))
    .addOption(new Option('-b, --bundler <bundler>', '构建工具').choices(['vite', 'webpack']))
    .addOption(new Option('--vue-version <major>', 'Vue 版本').choices(['2', '3']))
    .option('--react-version <version>', '完整 React 版本号，例如 18.3.1')
    .addOption(new Option('--router <enabled>', '是否启用路由').choices(['yes', 'no']))
    .addOption(new Option('--state <library>', '状态管理').choices(['none', 'vuex', 'pinia', 'redux', 'zustand']))
    .addOption(new Option('--css <syntax>', '样式预处理器').choices(['css', 'sass', 'less']))
    .addOption(new Option('--quality <tools>', '检查与格式化工具').choices(['both', 'eslint', 'prettier', 'none']))
    .option('-p, --port <port>', '开发服务器默认端口')
    .option('--no-interactive', '跳过提问，未指定的选项使用默认值')
    .option('--no-install', '跳过依赖安装')
    .action(async (name, options) => {
        if (!/^[a-z0-9][a-z0-9_-]{0,99}$/.test(name)) {
            throw new Error('项目名须以小写字母或数字开头，只能包含小写字母、数字、连字符和下划线，最多 100 字符。');
        }
        if (existsSync(name)) throw new Error(`目标已存在：${name}`);
        const settings = await selectProjectOptions(options);
        const { framework, language, bundler } = settings;
        const template = language === 'ts' ? `${framework}-ts` : framework;
        try {
            mkdirSync(name);
        } catch (error) {
            if (error.code === 'EEXIST') throw new Error(`目标已存在：${name}`);
            throw error;
        }
        createProject(name, name, settings);
        writeFileSync(join(name, configFile), JSON.stringify({ ...settings, template, bundler }, null, 2) + '\n');
        if (options.install && !runNpm(['install'], name)) {
            console.error(`项目文件已生成，可进入 ${name} 后重试 npm install。`);
            return;
        }
        console.log(`\ncd ${name}\n${options.install ? '' : 'npm install\n'}simple-cli start`);
    });

program.command('start').description('启动开发服务器并监听源码变化')
    .option('-m, --mode <name>', '覆盖本次运行的模式')
    .option('--host <host>', '指定监听地址')
    .option('--port <port>', '指定开发服务器端口')
    .action(options => runProject('dev', 'development', options));

program.command('build').description('生成生产构建产物')
    .option('-m, --mode <name>', '覆盖本次构建的模式')
    .action(options => runProject('build', 'production', options));

program.command('mode [name]').description('查看或保存项目的运行模式')
    .action(name => {
        const config = projectConfig();
        if (name === undefined) {
            console.log(config.mode ?? 'start: development\nbuild: production');
            return;
        }
        if (name === 'default') delete config.mode;
        else config.mode = validateMode(name);
        writeFileSync(configFile, JSON.stringify(config, null, 2) + '\n');
        console.log(config.mode ?? 'start: development\nbuild: production');
    });

program.command('version').description('显示脚手架版本').action(() => console.log(version));

try {
    if (process.argv.length === 2) program.outputHelp();
    else await program.parseAsync();
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
