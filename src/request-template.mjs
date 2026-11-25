export function requestTemplate({ bundler, language }) {
    const ts = language === 'ts';
    return {
        'proxy.config.cjs': `// 每个前缀对应一个开发后端。新增后端时在这里加一行。
module.exports = {
    '/api': 'http://127.0.0.1:3000',
    '/auth': 'http://127.0.0.1:3001',
};
`,
        ['src/api/client.' + language]: `import axios, { AxiosHeaders } from 'axios';
${ts ? "import type { AxiosHeaderValue, Method } from 'axios';\n" : ''}
export const api = axios.create({
    // 前端只请求当前站点。开发服务器按路径转发，生产通常由网关处理。
    baseURL: '/',
    timeout: 10000,
    allowAbsoluteUrls: false,
});

// 统一补充默认请求头，保留接口设置和调用时传入的请求头。
api.interceptors.request.use((config) => {
    config.headers.set('Accept', 'application/json', false);
    return config;
});

// 维持 Axios 的错误对象，页面可读取 HTTP 状态码或区分取消请求。
api.interceptors.response.use((response) => response, (error) => Promise.reject(error));

${ts ? `type Headers = Record<string, AxiosHeaderValue>;
type Endpoint = { url: string; method?: Method; headers?: Headers };
type RequestOptions<Data, Params> = {
    data?: Data;
    params?: Params;
    headers?: Headers;
    signal?: AbortSignal;
};

` : ''}// 声明接口时填写路径，方法默认 POST。调用时只传 data、params 等可变参数。
export function defineRequest${ts ? '<Result, Data = unknown, Params = Record<string, unknown>>' : ''}(
    { url, method = 'POST', headers }${ts ? ': Endpoint' : ''},
) {
    return async function request(options${ts ? ': RequestOptions<Data, Params>' : ''} = {}) {
        const response = await api.request${ts ? '<Result>' : ''}({
            url,
            method,
            data: options.data,
            params: options.params,
            signal: options.signal,
            headers: AxiosHeaders.concat(headers, options.headers),
        });
        return response.data;
    };
}
`,
        ['src/api/index.' + language]: `import { defineRequest } from './client';

${ts ? "type User = { id: string; name: string; email: string };\ntype UserList = { items: User[]; total: number };\n\n" : ''}// GET 不带请求体。params 会编码为 URL 查询参数。
export const getHealth = defineRequest${ts ? '<{ status: string }>' : ''}({ url: '/api/health', method: 'GET' });
export const listUsers = defineRequest${ts ? '<UserList, never, { page: number; pageSize: number }>' : ''}({
    url: '/api/users',
    method: 'GET',
});

// 搜索条件较复杂时，可用 POST 发送 JSON。这条示例不会修改数据。
export const searchUsers = defineRequest${ts ? '<UserList, { keyword: string }>' : ''}({
    url: '/api/users/search',
    headers: { 'Content-Type': 'application/json' },
});

// JSON 表单提交示例。调用 createUser({ data: { name, email } }) 才会创建用户。
export const createUser = defineRequest${ts ? "<User, Pick<User, 'name' | 'email'>>" : ''}({
    url: '/api/users',
});

// 通过 /auth 转发到认证服务。同源场景下浏览器会附带该站点的会话 Cookie。
export const getSession = defineRequest${ts ? '<{ user: User | null }>' : ''}({
    url: '/auth/session',
    method: 'GET',
});
`,
        ...(bundler === 'vite' ? { '.env.example': '# VITE_BASE=/my-app/\n' } : {}),
    };
}
