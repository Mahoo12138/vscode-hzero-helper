import { ExtensionContext, ViewColumn, WebviewPanel, window, workspace } from 'vscode';
import { WebviewHelper } from '../utils/webview-helper';
import { PermissionScannerProvider } from './permission-scanner-view';

export class HzeroPanel extends WebviewHelper.Webview {
  public static currentPanel: HzeroPanel | undefined;

  private constructor(
    panel: WebviewPanel,
    context: ExtensionContext,
    private permissionScannerProvider: PermissionScannerProvider) {
    super(panel, context, 'hzero-panel');
  }

  async handleWebviewMessage(message: any) {
    let data: any = null;
    switch (message.type) {
      case 'CHECK_PERMISSIONS':
        data = this.permissionScannerProvider.hasData();
        break;
      case 'GET_PERMISSION_FILES':
        data = this.permissionScannerProvider.getFileItems();
        break;
      case 'SHOW_QUICKPICK':
        // 显示选择框
        const selected = await window.showQuickPick(message.items, {
          placeHolder: 'Select a file to import'
        });
        data = selected ? selected.value : null;
        break;
      case 'GET_CURRENT_ENV':
        const config = workspace.getConfiguration('hzeroHelper');
        const list = config.get<Array<{ name: string, host: string }>>('env') || [];
        const curEnv = config.get<string>('currentEnv') || '';
        data = list.find(l => l.name === curEnv);
        break;
    }
    if (message.resp) {
      return this.handleMessageResonse(message.type, data);
    }
  }

  public static render(context: ExtensionContext, permissionScannerProvider: PermissionScannerProvider) {
    if (HzeroPanel.currentPanel) {
      HzeroPanel.currentPanel.panel.reveal(ViewColumn.One);
    } else {
      const panel = window.createWebviewPanel('hzero-panel', 'Permission Manage', ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: true
      });

      HzeroPanel.currentPanel = new HzeroPanel(panel, context, permissionScannerProvider);
    }
  }

  dispose() {
    HzeroPanel.currentPanel = undefined;
  }
}