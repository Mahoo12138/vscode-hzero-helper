import * as vscode from 'vscode';
import { WebviewHelper } from '../utils/webview-helper';
import { ExtensionContext } from 'vscode';

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

    private async handleMessage(message: { type: string; data?: any }) {
        const { type, data } = message;
        console.log('Received message:', type, data);

        switch (type) {
            case 'SCAN':
                // 触发扫描命令
                vscode.commands.executeCommand('vscode-hzero-helper.scanTsxFiles');
                break;
            case 'OPEN_OAUTH':
                // 触发打开 OAuth 面板命令
                vscode.commands.executeCommand('vscode-hzero-helper.open-hzero-panel');
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
                this.handleResponse(type, { env });
                break;
            case 'GET_CURRENT_ENV':
                const currentConfig = vscode.workspace.getConfiguration('hzeroHelper');
                const currentEnv = currentConfig.get<string>('currentEnv') || '';
                console.log('Sending current env:', currentEnv);
                this.handleResponse(type, currentEnv);
                break;
            case 'UPDATE_CURRENT_ENV':
                if (data?.env) {
                    const config = vscode.workspace.getConfiguration('hzeroHelper');
                    await config.update('currentEnv', data.env, vscode.ConfigurationTarget.Global);
                    console.log('Updated current env to:', data.env);
                }
                break;
            default:
                console.warn(`Unhandled message type: ${type}`);
        }
    }

    private handleResponse(type: string, data: any) {
        if (this.view) {
            this.view.webview.postMessage({ type: `${type}Response`, data });
        }
    }
}
