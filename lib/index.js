"use strict";

var _nodeChild_process = require("node:child_process");
var _nodeFs = require("node:fs");
var _nodePath = require("node:path");
var _nodeUtil = require("node:util");
var _nodeUrl = require("node:url");
var _commander = require("commander");
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
var packageFile = (0, _nodeUrl.fileURLToPath)(new URL('../package.json', import.meta.url));
var _JSON$parse = JSON.parse((0, _nodeFs.readFileSync)(packageFile, 'utf8')),
  version = _JSON$parse.version;
var configFile = '.simple-cli.json';
var program = new _commander.Command();
function runNpm(args) {
  var cwd = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : process.cwd();
  var windows = process.platform === 'win32';
  var npmCli = (0, _nodePath.join)((0, _nodePath.dirname)(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  var command = windows ? process.execPath : 'npm';
  var result = (0, _nodeChild_process.spawnSync)(command, windows ? [npmCli].concat(_toConsumableArray(args)) : args, {
    cwd: cwd,
    stdio: 'inherit'
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    var _result$status;
    process.exitCode = (_result$status = result.status) !== null && _result$status !== void 0 ? _result$status : result.signal === 'SIGINT' ? 130 : 1;
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
  if (!(0, _nodeFs.existsSync)(configFile)) throw new Error('请先进入 simple-cli init 创建的项目目录。');
  return JSON.parse((0, _nodeFs.readFileSync)(configFile, 'utf8'));
}
function runProject(script, defaultMode, options) {
  var _ref, _options$mode;
  var config = projectConfig();
  var mode = validateMode((_ref = (_options$mode = options.mode) !== null && _options$mode !== void 0 ? _options$mode : config.mode) !== null && _ref !== void 0 ? _ref : defaultMode);
  var args = ['run', script, '--', '--mode', mode];
  if (options.host !== undefined) args.push('--host', options.host);
  if (options.port !== undefined) args.push('--port', options.port);
  runNpm(args);
}
program.name('simple-cli').description('创建、开发和构建 Vue 或 React 项目').version(version);
program.command('init <name>').description('创建 Vite 项目并安装依赖').addOption(new _commander.Option('-t, --template <framework>', '项目模板').choices(['vue', 'react', 'vue-ts', 'react-ts'])["default"]('vue')).option('--no-install', '跳过依赖安装').action(function (name, options) {
  if (!/^[a-z0-9][a-z0-9_-]{0,99}$/.test(name)) {
    throw new Error('项目名须以小写字母或数字开头，只能包含小写字母、数字、连字符和下划线，最多 100 字符。');
  }
  try {
    (0, _nodeFs.mkdirSync)(name);
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error("\u76EE\u6807\u5DF2\u5B58\u5728\uFF1A".concat(name));
    throw error;
  }
  if (!runNpm(['exec', '--yes', '--package=create-vite@7', '--', 'create-vite', name, '--template', options.template, '--no-interactive'])) {
    console.error("\u521D\u59CB\u5316\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u76EE\u5F55 ".concat(name, " \u548C\u4E0A\u65B9\u7684 npm \u9519\u8BEF\u3002"));
    return;
  }
  (0, _nodeFs.writeFileSync)((0, _nodePath.join)(name, configFile), JSON.stringify({
    template: options.template
  }, null, 2) + '\n');
  if (options.install && !runNpm(['install'], name)) {
    console.error("\u9879\u76EE\u6587\u4EF6\u5DF2\u751F\u6210\uFF0C\u53EF\u8FDB\u5165 ".concat(name, " \u540E\u91CD\u8BD5 npm install\u3002"));
    return;
  }
  console.log("\ncd ".concat(name, "\n").concat(options.install ? '' : 'npm install\n', "simple-cli start"));
});
program.command('start').description('启动带热更新的开发服务器').option('-m, --mode <name>', '覆盖项目的 Vite 模式').option('--host <host>', '指定监听地址').option('--port <port>', '指定开发服务器端口').action(function (options) {
  return runProject('dev', 'development', options);
});
program.command('build').description('生成生产构建产物').option('-m, --mode <name>', '覆盖项目的 Vite 模式').action(function (options) {
  return runProject('build', 'production', options);
});
program.command('mode [name]').description('查看或保存项目的 Vite 模式').action(function (name) {
  var _config$mode2;
  var config = projectConfig();
  if (name === undefined) {
    var _config$mode;
    console.log((_config$mode = config.mode) !== null && _config$mode !== void 0 ? _config$mode : 'start: development\nbuild: production');
    return;
  }
  if (name === 'default') delete config.mode;else config.mode = validateMode(name);
  (0, _nodeFs.writeFileSync)(configFile, JSON.stringify(config, null, 2) + '\n');
  console.log((_config$mode2 = config.mode) !== null && _config$mode2 !== void 0 ? _config$mode2 : 'start: development\nbuild: production');
});
program.command('version').description('显示脚手架版本').action(function () {
  return console.log(version);
});
try {
  if (process.argv.length === 2) program.outputHelp();else program.parse();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}