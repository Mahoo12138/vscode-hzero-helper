import * as vscode from 'vscode';
import { WebviewHelper } from '../utils/webview-helper';

export class OAuthPanel extends WebviewHelper.Webview {

    public static currentPanel: OAuthPanel | undefined;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
        super(panel, context, 'oauth-panel');
        this.extensionUri = context.extensionUri;

        // 当面板关闭时清理资源
        this.panel.onDidDispose(
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

    public static render(context: vscode.ExtensionContext) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (OAuthPanel.currentPanel) {
            OAuthPanel.currentPanel.panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'hzero-oauth',
            'Hzero Oauth',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        OAuthPanel.currentPanel = new OAuthPanel(panel, context);
    }

    private updateWebviewContent(token: string) {
        this.panel.webview.postMessage({ type: "TOKEN_UPDATE", data: token });
    }

    static handleCallback(token: string) {
        if (OAuthPanel.currentPanel) {
            OAuthPanel.currentPanel.updateWebviewContent(token);
        }
        const list = vscode.workspace.getConfiguration('hzeroHelper').get<any[]>('env') || [];
        const currentEnv = vscode.workspace.getConfiguration('hzeroHelper').get('currentEnv');
        const index = list.findIndex(e => e.name === currentEnv)
        if (index >= 0) {
            list[index].token = token;
            vscode.workspace.getConfiguration('hzeroHelper').update('env', list, true);
            vscode.window.showInformationMessage('Login successfully!');
        }


    }

    dispose() {
        OAuthPanel.currentPanel = undefined;
    }

    async handleWebviewMessage(message: any) {
        switch (message.type) {
            case 'login':
                const redirectUri = encodeURIComponent('vscode://mahoo12138.vscode-hzero-helper/oauth/callback');
                const authUrl = `https://demo.56mada.com:8443/oauth/oauth/authorize?response_type=token&client_id=localhost&redirect_uri=${redirectUri}`;
                vscode.env.openExternal(vscode.Uri.parse(authUrl));
                break;
            case 'CLOSE_WEBVIEW':
                this.panel.dispose();
                vscode.commands.executeCommand('vscode-hzero-helper.open-hzero-panel');
                break;
        }
    }
}
