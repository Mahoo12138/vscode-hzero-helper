import * as vscode from 'vscode';
import { getHtml } from '../html';

export default class ConfigView implements vscode.WebviewViewProvider {
    public static readonly viewType = 'hzero-helper.config-view';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        // webviewView.webview.asWebviewUri()

        // 处理来自 webview 的消息
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'scan':
                    // 触发扫描命令
                    vscode.commands.executeCommand('vscode-hzero-helper.scanTsxFiles');
                    break;
                case 'openOAuth':
                    // 触发打开 OAuth 面板命令
                    vscode.commands.executeCommand('vscode-hzero-helper.openOAuthPanel');
                    break;
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return getHtml(webview, this._extensionUri, {
            title: 'Hzero Helper Config',
            body: `
                <div class="container">
                    <h2>Hzero Helper</h2>
                    <div class="button-container">
                        <button class="button" id="scanButton">
                            <i class="codicon codicon-search"></i>
                            Scan TSX Files
                        </button>
                        <button class="button" id="oauthButton">
                            <i class="codicon codicon-sign-in"></i>
                            Open Hzero Panel
                        </button>
                    </div>
                </div>
                <style>
                    .container {
                        padding: 10px;
                    }
                    .button-container {
                        margin-top: 20px;
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
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
                    .button i {
                        font-size: 14px;
                    }
                </style>
            `,
            scripts: `
                document.getElementById('scanButton').addEventListener('click', () => {
                    console.log("scan");
                    vscode.postMessage({ type: 'scan' });
                });

                document.getElementById('oauthButton').addEventListener('click', () => {
                    console.log("open oauth panel");
                    vscode.postMessage({ type: 'openOAuth' });
                });
            `
        });
    }
}
