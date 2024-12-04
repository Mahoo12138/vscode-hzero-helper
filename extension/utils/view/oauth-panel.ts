import * as vscode from 'vscode';
import { getHtml } from '../html';

export class OAuthPanel {
    public static currentPanel: OAuthPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // 设置 webview 内容
        this._updateWebviewContent();

        // 监听 webview 消息
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.type) {
                    case 'login':
                        // 使用系统默认浏览器打开登录页面
                        const redirectUri = encodeURIComponent('vscode://mahoo12138.vscode-hzero-helper/oauth/callback');
                        const authUrl = `https://demo.56mada.com:8443/oauth/oauth/authorize?response_type=token&client_id=localhost&redirect_uri=${redirectUri}`;
                        vscode.env.openExternal(vscode.Uri.parse(authUrl));
                        break;
                    case 'clearToken':
                        await vscode.workspace.getConfiguration('hzeroHelper').update('token', undefined, true);
                        this._updateWebviewContent();
                        vscode.window.showInformationMessage('Token cleared successfully!');
                        break;
                }
            },
            null,
            this._disposables
        );

        // 当面板关闭时清理资源
        this._panel.onDidDispose(
            () => {
                OAuthPanel.currentPanel = undefined;
                while (this._disposables.length) {
                    const disposable = this._disposables.pop();
                    if (disposable) {
                        disposable.dispose();
                    }
                }
            },
            null,
            this._disposables
        );
    }

    private _updateWebviewContent() {
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
    }

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (OAuthPanel.currentPanel) {
            OAuthPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'hzeroOAuth',
            'Hzero OAuth',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        OAuthPanel.currentPanel = new OAuthPanel(panel, extensionUri);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const token = vscode.workspace.getConfiguration('hzeroHelper').get<string | null>('token');
        const hasToken = !!token;

        const loginContent = `
            <div class="container">
                <h2>Hzero OAuth Login</h2>
                <p>Click the button below to login and get your token:</p>
                <button class="button" id="loginButton">
                    <i class="codicon codicon-sign-in"></i>
                    Login to Hzero
                </button>
                <div id="status" style="margin-top: 20px;"></div>
            </div>
        `;

        const tokenContent = `
            <div class="container">
                <h2>Token Information</h2>
                <div class="token-info">
                    <p>You are currently logged in to Hzero.</p>
                    <p>Token: ${token?.substring(0, 10)}...</p>
                </div>
                <button class="button warning" id="clearTokenButton">
                    <i class="codicon codicon-sign-out"></i>
                    Clear Token
                </button>
            </div>
        `;

        return getHtml(webview, this._extensionUri, {
            title: 'Hzero OAuth',
            body: hasToken ? tokenContent : loginContent,
            scripts: `
                ${!hasToken ? `
                    document.getElementById('loginButton')?.addEventListener('click', () => {
                        vscode.postMessage({ type: 'login' });
                        document.getElementById('status').textContent = 'Opening browser for login...';
                    });
                ` : `
                    document.getElementById('clearTokenButton')?.addEventListener('click', () => {
                        vscode.postMessage({ type: 'clearToken' });
                    });
                `}

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.type) {
                        case 'tokenReceived':
                            document.getElementById('status')?.textContent = 'Token received and saved!';
                            setTimeout(() => {
                                window.location.reload();
                            }, 1000);
                            break;
                    }
                });
            `,
            styles: `
                .container {
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 20px;
                }
                .button {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 16px;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                }
                .button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .button.warning {
                    background-color: var(--vscode-errorForeground);
                }
                .button.warning:hover {
                    opacity: 0.9;
                }
                .button i {
                    font-size: 14px;
                }
                .token-info {
                    background-color: var(--vscode-editor-background);
                    padding: 16px;
                    border-radius: 4px;
                    border: 1px solid var(--vscode-panel-border);
                }
            `
        });
    }

    public static handleCallback(token: string) {
        if (OAuthPanel.currentPanel) {
            // 保存 token 到配置
            vscode.workspace.getConfiguration('hzeroHelper').update('token', token, true);
            // 更新状态显示
            OAuthPanel.currentPanel._panel.webview.postMessage({ type: 'tokenReceived' });
            vscode.window.showInformationMessage('Token saved successfully!');
            // 更新面板内容
            setTimeout(() => {
                if (OAuthPanel.currentPanel) {
                    OAuthPanel.currentPanel._updateWebviewContent();
                }
            }, 1000);
        } else {
            // 如果面板已经关闭，直接保存 token
            vscode.workspace.getConfiguration('hzeroHelper').update('token', token, true);
            vscode.window.showInformationMessage('Token saved successfully!');
        }
    }
}
