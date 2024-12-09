import * as vscode from 'vscode';
import { WebviewHelper } from '../utils/webview-helper';
import { ExtensionContext } from 'vscode';
import { MSG_SUFFIX } from '../constants';

export default class ConfigView implements vscode.WebviewViewProvider {
    public static readonly viewType = 'hzero-helper.config-view';

    private readonly _extensionUri: vscode.Uri;

    private view?: vscode.WebviewView;

    constructor(
        private readonly _context: ExtensionContext
    ) {
        this._extensionUri = _context.extensionUri;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this.view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = WebviewHelper.setupHtml(webviewView.webview, this._context, 'config-view');

        // 处理来自 webview 的消息
        webviewView.webview.onDidReceiveMessage(this.handleMessage.bind(this));
    }

    private async handleMessage(message: { type: string; data?: any, resp: any }) {
        const { type, data, resp } = message;
        console.log('Received message:', type, data);
        let res: any = null;
        switch (type) {
            case 'SCAN':
                // 触发扫描命令
                await vscode.commands.executeCommand('vscode-hzero-helper.scan-permission');
                res = { message: '操作成功' };
                break;
            case 'OPEN_HZERO_OAUTH':
                // 触发打开 OAuth 面板命令
                await vscode.commands.executeCommand('vscode-hzero-helper.open-hzero-panel');
                res = { message: '操作成功' };
                break;
            case 'CREATE_ENV':
                try {
                    // 执行创建环境命令并等待完成
                    await vscode.commands.executeCommand('vscode-hzero-helper.create-env');

                    // 重新获取最新的环境列表
                    const updatedConfig = vscode.workspace.getConfiguration('hzeroHelper');
                    const updatedEnv = updatedConfig.get<Array<{ name: string, host: string }>>('env') || [];

                    // 返回最新的环境列表
                    this.handleResponse(type, {
                        env: updatedEnv,
                        message: '环境创建成功'
                    });
                } catch (error) {
                    console.error('创建环境失败:', error);
                    this.handleResponse(type, {
                        env: [],
                        message: '环境创建失败',
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
                break;
            case 'GET_ENV_LIST':
                const config = vscode.workspace.getConfiguration('hzeroHelper');
                const env = config.get<Array<{ name: string, host: string }>>('env') || [];
                console.log('Sending env list:', env);
                res = { env };
                break;
            case 'GET_CURRENT_ENV':
                const currentConfig = vscode.workspace.getConfiguration('hzeroHelper');
                res = currentConfig.get<string>('currentEnv') || '';
                break;
            case 'UPDATE_CURRENT_ENV':
                if (data?.env) {
                    const config = vscode.workspace.getConfiguration('hzeroHelper');
                    await config.update('currentEnv', data.env, vscode.ConfigurationTarget.Global);
                }
                break;
            default:
                console.warn(`Unhandled message type: ${type}`);
        }
        if (resp) {
            this.handleResponse(type, res);
        }
    }

    private handleResponse(type: string, data: any) {
        if (this.view) {
            this.view.webview.postMessage({ type: `${type}${MSG_SUFFIX}`, data });
        }
    }
}
