import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { Command, Option } from 'commander';
import { createWebpackProject } from './webpack-template.mjs';

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
    if (options.port !== undefined) args.push('--port', options.port);
    runNpm(args);
}

async function selectOption(prompt, choices, labels) {
    while (true) {
        const answer = (await prompt.question(`请选择${labels}（${choices.map((choice, index) => `${index + 1}. ${choice}`).join(' / ')}，默认 1）：`)).trim().toLowerCase();
        if (answer === '') return choices[0];
        if (choices.includes(answer)) return answer;
        const index = choices.findIndex((_, i) => String(i + 1) === answer);
        if (index !== -1) return choices[index];
        console.log('请输入选项编号或名称。');
    }
}

async function selectTemplate(options) {
    const [templateFramework, templateLanguage = 'js'] = options.template?.split('-') ?? [];
    if (options.template && ((options.framework && options.framework !== templateFramework)
        || (options.language && options.language !== templateLanguage))) {
        throw new Error('--template 与 --framework 或 --language 选项冲突。');
    }
    let framework = options.framework ?? templateFramework;
    let language = options.language ?? (options.template ? templateLanguage : undefined);
    let bundler = options.bundler;
    if (process.stdin.isTTY && process.stdout.isTTY && options.interactive && (!framework || !language || !bundler)) {
        const prompt = createInterface({ input: process.stdin, output: process.stdout });
        prompt.on('SIGINT', () => { console.log('\n已取消初始化。'); process.exit(130); });
        try {
            framework ??= await selectOption(prompt, ['vue', 'react'], '框架');
            language ??= await selectOption(prompt, ['js', 'ts'], '语言');
            bundler ??= await selectOption(prompt, ['vite', 'webpack'], '构建工具');
        } finally {
            prompt.close();
        }
    }
    return { framework: framework ?? 'vue', language: language ?? 'js', bundler: bundler ?? 'vite' };
}

program.name('simple-cli').description('创建、开发和构建 Vue 或 React 项目').version(version);

program.command('init <name>')
    .description('选择框架、语言和构建工具，创建项目并安装依赖')
    .addOption(new Option('-t, --template <template>', '一次指定框架和语言')
        .choices(['vue', 'react', 'vue-ts', 'react-ts']))
    .addOption(new Option('-f, --framework <framework>', '项目框架').choices(['vue', 'react']))
    .addOption(new Option('-l, --language <language>', '源码语言').choices(['js', 'ts']))
    .addOption(new Option('-b, --bundler <bundler>', '构建工具').choices(['vite', 'webpack']))
    .option('--no-interactive', '跳过提问，未指定的选项使用默认值')
    .option('--no-install', '跳过依赖安装')
    .action(async (name, options) => {
        if (!/^[a-z0-9][a-z0-9_-]{0,99}$/.test(name)) {
            throw new Error('项目名须以小写字母或数字开头，只能包含小写字母、数字、连字符和下划线，最多 100 字符。');
        }
        if (existsSync(name)) throw new Error(`目标已存在：${name}`);
        const { framework, language, bundler } = await selectTemplate(options);
        const template = language === 'ts' ? `${framework}-ts` : framework;
        try {
            mkdirSync(name);
        } catch (error) {
            if (error.code === 'EEXIST') throw new Error(`目标已存在：${name}`);
            throw error;
        }
        if (bundler === 'webpack') {
            createWebpackProject(name, name, framework, language);
        } else if (!runNpm(['exec', '--yes', '--package=create-vite@7', '--', 'create-vite',
            name, '--template', template, '--no-interactive', '--no-install'])) {
            console.error(`初始化失败，请检查目录 ${name} 和上方的 npm 错误。`);
            return;
        }
        writeFileSync(join(name, configFile), JSON.stringify({ template, bundler }, null, 2) + '\n');
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
