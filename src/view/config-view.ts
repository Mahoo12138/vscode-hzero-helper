import * as vscode from "vscode";
import { wrapperHTML } from "../utils/html";
import { PREFIX } from "../constants";

export default class ConfigView implements vscode.WebviewViewProvider {
  public static readonly viewType = PREFIX + ".config-view";

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case "FOLDER_SELECTING": {
          // vscode.window.activeTextEditor?.insertSnippet(
          //   new vscode.SnippetString(`#${data.value}`)
          // );
          vscode.window
            .showOpenDialog({
              canSelectFolders: true,
              canSelectFiles: false,
              canSelectMany: false,
              openLabel: "Select Folder",
            })
            .then((uri) => {
              // 将选择的工作区目录发送给 Webview
              if (uri && uri.length > 0) {
                webviewView.webview.postMessage({
                  type: "FOLDER_SELECTED",
                  url: uri[0].fsPath,
                });
              }
            });
          break;
        }
        case "FOLDER_SELECTED": {
          // vscode.window.activeTextEditor?.insertSnippet(
          //   new vscode.SnippetString(`#${data.value}`)
          // );
          vscode.window.showInformationMessage("url:", data.url);
          break;
        }
      }
    });
  }

  public addColor() {
    if (this._view) {
      this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
      this._view.webview.postMessage({ type: "addColor" });
    }
  }

  public clearColors() {
    if (this._view) {
      this._view.webview.postMessage({ type: "clearColors" });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "resources/css", "vscode.css")
    );

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "resources/js", "config.js")
    );

    const content = `<button id="select-folder-btn">Select Folder</button>`;

    return wrapperHTML({
      content,
      cspSource: webview.cspSource,
      styleLinks: [styleVSCodeUri],
      scriptLinks: [scriptUri],
    });
  }
}
