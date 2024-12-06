import { Disposable, ExtensionContext, ViewColumn, WebviewPanel, window } from 'vscode';
import { WebviewHelper } from './helper';
import { PermissionScannerProvider } from '../utils/view/permission-scanner-view';

export class MainPanel {
  public static currentPanel: MainPanel | undefined;
  private readonly _panel: WebviewPanel;
  private _disposables: Disposable[] = [];
  private _permissionScannerProvider: PermissionScannerProvider;

  private constructor(panel: WebviewPanel, context: ExtensionContext, permissionScannerProvider: PermissionScannerProvider) {
    this._panel = panel;
    this._permissionScannerProvider = permissionScannerProvider;

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.html = WebviewHelper.setupHtml(this._panel.webview, context, 'hzero-panel.html');

    // 设置消息处理
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'checkPermissionScannerData':
            // 检查权限扫描器是否有数据
            const hasData = this._permissionScannerProvider.hasData();
            return hasData;

          case 'getPermissionFiles':
            // 获取文件类型的权限项
            const files = this._permissionScannerProvider.getFileItems();
            return files;

          case 'showQuickPick':
            // 显示选择框
            const selected = await window.showQuickPick(message.items, {
              placeHolder: '请选择要导入的文件'
            });
            return selected ? selected.value : null;

          case 'showMessage':
            // 显示消息
            switch (message.level) {
              case 'info':
                window.showInformationMessage(message.message);
                break;
              case 'warning':
                window.showWarningMessage(message.message);
                break;
              case 'error':
                window.showErrorMessage(message.message);
                break;
            }
            return;

          case 'getConfiguration':
            // 获取配置
            const config = context.workspaceState.get(message.key);
            return config;
        }
      },
      null,
      this._disposables
    );

    WebviewHelper.setupWebviewHooks(this._panel.webview, this._disposables);
  }

  public static render(context: ExtensionContext, permissionScannerProvider: PermissionScannerProvider) {
    console.log('MainPanel render');
    if (MainPanel.currentPanel) {
      MainPanel.currentPanel._panel.reveal(ViewColumn.One);
    } else {
      const panel = window.createWebviewPanel('showPage1', '权限管理', ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: true
      });

      MainPanel.currentPanel = new MainPanel(panel, context, permissionScannerProvider);
    }
  }

  /**
   * Cleans up and disposes of webview resources when the webview panel is closed.
   */
  public dispose() {
    MainPanel.currentPanel = undefined;

    // Dispose of the current webview panel
    this._panel.dispose();

    // Dispose of all disposables (i.e. commands) for the current webview panel
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}