export function aboutRequests(language) {
    const ts = language === 'ts';
    return `import { getHealth, getSession, listUsers, searchUsers } from '@/api';

export const requestExamples = [
    { label: 'GET 服务状态', run: (signal${ts ? ': AbortSignal' : ''}) => getHealth({ signal }) },
    { label: 'GET 用户列表', run: (signal${ts ? ': AbortSignal' : ''}) => listUsers({ params: { page: 1, pageSize: 10 }, signal }) },
    { label: 'POST 搜索用户', run: (signal${ts ? ': AbortSignal' : ''}) => searchUsers({ data: { keyword: 'demo' }, signal }) },
    { label: 'GET 当前会话', run: (signal${ts ? ': AbortSignal' : ''}) => getSession({ signal }) },
];

// 页面私有逻辑。离开 About 时取消请求，避免上一次结果覆盖当前状态。
export function createRequestRunner(update${ts ? ': (state: { loading: boolean; message: string }) => void' : ''}) {
    let active${ts ? ': AbortController | undefined' : ''};

    function cancel() {
        active?.abort();
        active = undefined;
    }

    async function run(request${ts ? ': (signal: AbortSignal) => Promise<unknown>' : ''}) {
        cancel();
        const controller = new AbortController();
        active = controller;
        update({ loading: true, message: '请求中…' });

        try {
            const data = await request(controller.signal);
            if (!controller.signal.aborted) {
                update({ loading: false, message: JSON.stringify(data, null, 2) ?? '请求成功，无响应体。' });
            }
        } catch (error) {
            if (!controller.signal.aborted) {
                update({ loading: false, message: error instanceof Error ? error.message : '请求失败' });
            }
        } finally {
            if (active === controller) active = undefined;
        }
    }

    return { run, cancel };
}
`;
}
