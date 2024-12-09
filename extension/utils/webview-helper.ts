import { Disposable, ExtensionContext, Webview, WebviewPanel, window } from 'vscode';
import { MSG_SUFFIX } from '../constants';

export class WebviewHelper {
  public static setupHtml(webview: Webview, context: ExtensionContext, target: string) {
    return process.env.VITE_DEV_SERVER_URL
      ? __getWebviewHtml__(process.env.VITE_DEV_SERVER_URL + target)
      : __getWebviewHtml__(webview, context, target);
  }
}


export namespace WebviewHelper {
  export abstract class Webview {
    protected disposables: Disposable[] = [];

    constructor(protected readonly panel: WebviewPanel, protected context: ExtensionContext, public name: string) {
      this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
      this.panel.webview.html = this.getWebviewContent();
      this.panel.webview.onDidReceiveMessage(this.onWebviewMessage.bind(this), null, this.disposables);
    }

    abstract dispose(): any;
    abstract handleWebviewMessage(message: any): any;

    handleMessageResonse(type: string, data: any) {
      this.panel.webview.postMessage({ type: `${type}${MSG_SUFFIX}`, data });
    }
    getWebviewContent() {
      return WebviewHelper.setupHtml(this.panel.webview, this.context, this.name);
    };

    private onWebviewMessage(msg: any) {
      const { type, data } = msg;
      switch (type) {
        case 'SHOW_MESSAGE':
          // 显示消息
          switch (data.level) {
            case 'info':
              window.showInformationMessage(data.message);
              break;
            case 'warning':
              window.showWarningMessage(data.message);
              break;
            case 'error':
              window.showErrorMessage(data.message);
              break;
          }
          break;
        default:
          this.handleWebviewMessage(msg);
      }
    }
  }
}