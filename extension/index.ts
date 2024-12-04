import * as vscode from "vscode";
import ConfigView from './utils/view/config-view';
import { TsxScanner } from './tsxScanner';
import { PermissionScannerProvider } from './utils/view/permission-scanner-view';
import { OAuthPanel } from './utils/view/oauth-panel';
import { MainPanel } from './views/panel';

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "vscode-hzero-helper" is now active!'
  );

  const extensionId = context.extension.id; // 获取插件 ID
  console.log(`Extension ID: ${extensionId}`);
  vscode.window.showInformationMessage(`Extension ID: ${extensionId}`);

  let disposable = vscode.commands.registerCommand(
    "vscode-hzero-helper.helloWorld",
    () => {
      vscode.window.showInformationMessage(
        "Hello VS Code from vscode-hzero-helper!"
      );
    }
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-hzero-helper.showPage1', async () => {
      MainPanel.render(context);
    }),
  );

  context.subscriptions.push(disposable);


  const configView = new ConfigView(context.extensionUri);



	context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ConfigView.viewType,
      configView
    )
  );


  // 注册权限扫描器视图
  const permissionScannerProvider = new PermissionScannerProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      'permission-scanner',
      permissionScannerProvider
    )
  );

  // 注册扫描命令
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-hzero-helper.scanTsxFiles", async () => {
      const scanner = new TsxScanner();
      await scanner.scan(permissionScannerProvider);
    })
  );

  // 注册打开 OAuth 面板命令
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-hzero-helper.openOAuthPanel", () => {
      OAuthPanel.createOrShow(context.extensionUri);
    })
  );

  // 处理 URI 回调
  vscode.window.registerUriHandler({
    handleUri(uri: vscode.Uri): void {
      if (uri.path === '/oauth/callback') {
        const hash = uri.fragment;
        if (hash) {
          const token = new URLSearchParams(hash).get('access_token');
          if (token) {
            OAuthPanel.handleCallback(token);
          }
        }
      }
    }
  });
}

export function deactivate() {}
