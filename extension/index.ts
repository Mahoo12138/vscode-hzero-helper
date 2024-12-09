import * as vscode from "vscode";
import { TsxScanner } from './utils/file-scanner';
import ConfigView from './views/config-view';
import { PermissionScannerProvider } from './views/permission-scanner-view';
import { OAuthPanel } from './views/oauth-panel';
import { HzeroPanel } from './views/hzero-panel';

export function activate(context: vscode.ExtensionContext) {

  context.subscriptions.push(vscode.commands.registerCommand(
    "vscode-hzero-helper.create-env",
    async () => {
      // 获取环境名称
      const name = await vscode.window.showInputBox({
        prompt: "请输入环境名称",
        placeHolder: "例如: dev, test, prod",
        validateInput: (value) => {
          if (!value) {
            return "环境名称不能为空";
          }
          return null;
        }
      });

      if (!name) {
        return; // 用户取消了输入
      }

      // 获取环境地址
      const host = await vscode.window.showInputBox({
        prompt: "请输入环境地址",
        placeHolder: "例如: https://demo.56mada.com:8443",
        validateInput: (value) => {
          if (!value) {
            return "环境地址不能为空";
          }
          try {
            new URL(value);
            return null;
          } catch {
            return "请输入有效的URL地址";
          }
        }
      });

      if (!host) {
        return; // 用户取消了输入
      }

      // 获取当前配置
      const config = vscode.workspace.getConfiguration("hzeroHelper");
      const currentEnv = config.get<Array<{ name: string, host: string }>>("env") || [];

      // 检查是否存在相同名称的环境
      const existingIndex = currentEnv.findIndex(env => env.name === name);
      if (existingIndex !== -1) {
        const action = await vscode.window.showWarningMessage(
          `环境 "${name}" 已存在，是否覆盖？`,
          "覆盖",
          "取消"
        );
        if (action === "覆盖") {
          currentEnv[existingIndex] = { name, host };
        } else {
          return;
        }
      } else {
        // 添加新环境
        currentEnv.push({ name, host });
      }

      // 更新配置
      await config.update("env", currentEnv, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(`环境 "${name}" 已成功${existingIndex !== -1 ? '更新' : '添加'}`);
    }
  ));

  // 创建权限扫描器提供者实例
  const permissionScannerProvider = new PermissionScannerProvider();

  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-hzero-helper.showPage1', async () => {
      // 创建面板时传入权限扫描器提供者实例
      HzeroPanel.render(context, permissionScannerProvider);
    }),
  );


  const configView = new ConfigView(context);

  // 注册配置页面
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ConfigView.viewType,
      configView
    )
  );

  // 注册权限扫描器视图
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      'permission-scanner',
      permissionScannerProvider
    )
  );

  // 注册扫描命令
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-hzero-helper.scan-permission", async () => {
      const scanner = new TsxScanner();
      await scanner.scan(permissionScannerProvider);
    })
  );

  // 注册打开 Hzero 面板命令
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-hzero-helper.open-hzero-panel", () => {
      // 获取配置
      const config = vscode.workspace.getConfiguration('hzeroHelper');
      const envList = config.get<Array<{ name: string, host: string, token?: string }>>('env') || [];
      const currentEnv = config.get<string>('currentEnv') || '';

      // 检查环境列表是否为空
      if (envList.length === 0) {
        vscode.window.showErrorMessage('请先添加"操作环境"');
        return;
      }

      // 确定当前环境
      let selectedEnv = envList.find(env => env.name === currentEnv);

      // 如果当前环境为空，选择第一个环境
      if (!selectedEnv) {
        selectedEnv = envList[0];
        // 更新当前环境配置
        config.update('currentEnv', selectedEnv.name, vscode.ConfigurationTarget.Global);
      }

      // 检查 token
      if (!selectedEnv.token) {
        // 打开 OAuth 面板
        OAuthPanel.render(context);
      } else {
        // 打开 Hzero 面板
        HzeroPanel.render(context, permissionScannerProvider);
      }
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

export function deactivate() { }
