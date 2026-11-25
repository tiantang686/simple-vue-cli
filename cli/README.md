# simple-vue-cli

`simple-cli` 用来创建、启动和构建 Vue 3 或 React 项目。初始化时可组合选择 JavaScript 或 TypeScript，以及 Vite 或 Webpack。运行脚手架需要 Node.js 22.12+ 和 npm。

## 安装

在仓库根目录执行：

```powershell
cd cli
npm install
npm link
simple-cli --version
```

`npm link` 会注册全局 `simple-cli` 命令。链接完成后，可以到任意目录创建项目。如果 PowerShell 的执行策略拦截了 npm 生成的 `.ps1` 脚本，可以使用 `npm.cmd` 和 `simple-cli.cmd`。

## 快速开始

```powershell
simple-cli init my-app
cd my-app
simple-cli start
```

`init` 会依次询问框架、语言和构建工具。输入编号或名称后按 Enter，也可以直接按 Enter 选默认项。初始化默认安装依赖。启动后打开终端打印的地址，按 `Ctrl+C` 停止开发服务器。

## 命令参考

### `init <name>` 创建项目

在当前目录创建新项目。项目名以小写字母或数字开头，可包含小写字母、数字、连字符和下划线，最多 100 字符。已有同名目录时会报错。

| 选项                            | 值和行为                                                              |
| ------------------------------- | --------------------------------------------------------------------- |
| `-f, --framework <framework>` | `vue` 或 `react`，默认 `vue`                                    |
| `-l, --language <language>`   | `js` 或 `ts`，默认 `js`                                         |
| `-b, --bundler <bundler>`     | `vite` 或 `webpack`，默认 `vite`                                |
| `-t, --template <template>`   | 同时指定框架和语言，支持 `vue`、`vue-ts`、`react`、`react-ts` |
| `--no-interactive`            | 跳过提问，未指定的选项使用默认值。非交互终端也会使用这一行为          |
| `--no-install`                | 只生成文件，之后可进入项目目录执行 `npm install`                    |

已通过参数指定的选项会跳过对应提问。`--template` 可与 `--bundler` 搭配，与 `--framework` 或 `--language` 的取值冲突时会报错。

```powershell
# 交互选择
simple-cli init my-app

# Vue + JavaScript + Vite
simple-cli init vue-app --template vue --bundler vite

# React + TypeScript + Webpack
simple-cli init react-app --framework react --language ts --bundler webpack

# Vue + TypeScript + Webpack，只生成文件
simple-cli init vue-webpack --template vue-ts --bundler webpack --no-install
cd vue-webpack
npm install
```

生成的项目根目录包含 `.simple-cli.json` 和 `package.json`，应用入口在 `src/`。Vite 使用官方模板，Webpack 项目包含 `webpack.config.cjs`。Webpack 的 TypeScript 模板也提供 `npm run typecheck`。

### `start` 启动开发服务器

在生成的项目根目录运行。默认模式为 `development`。Vite 和 Webpack Vue 模板支持热更新，Webpack React 模板在保存后自动刷新页面。

```powershell
simple-cli start
simple-cli start --port 3000
simple-cli start --host 0.0.0.0 --port 3000 --mode staging
```

支持 `--host <host>`、`--port <port>`、`-m, --mode <name>`。使用 `--host 0.0.0.0` 时，局域网设备可通过本机 IP 访问。

### `build` 构建项目

在生成的项目根目录运行。默认模式为 `production`，构建产物在 `dist/`。

```powershell
simple-cli build
simple-cli build --mode staging
simple-cli build -m staging
```

### `mode [name]` 查看或设置模式

在生成的项目根目录运行。保存的模式同时用于 `start` 和 `build`。单次命令的 `--mode` 优先于保存的模式，且不会修改 `.simple-cli.json`。使用 `mode default` 恢复各命令自己的默认模式。

```powershell
simple-cli mode
simple-cli mode staging
simple-cli start
simple-cli build --mode production
simple-cli mode default
```

例如，使用 `staging` 时，可以在项目根目录创建 `.env.staging`：

- Vite 项目设置 `VITE_API_URL=https://example.com`，在应用里通过 `import.meta.env.VITE_API_URL` 读取。
- Webpack 项目设置 `WEBPACK_API_URL=https://example.com`，在应用里通过 `process.env.WEBPACK_API_URL` 读取。`process.env.APP_MODE` 返回脚手架选择的模式。Webpack 仍按 `start` 的开发优化和 `build` 的生产优化运行。

上述变量会进入前端产物，仅用于可公开的配置。

### `help [command]` 查看帮助

```powershell
simple-cli
simple-cli help
simple-cli help init
simple-cli help start
simple-cli build --help
simple-cli -h
```

### `version` 查看版本

```powershell
simple-cli version
simple-cli --version
simple-cli -V
```

### 相关文档

- [Vite 官方指南](https://vite.dev/guide/)
- [Webpack 开发服务器](https://webpack.js.org/configuration/dev-server/)
- [Webpack 环境变量](https://webpack.js.org/configuration/dotenv/)
