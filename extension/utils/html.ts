import * as vscode from "vscode";

export const wrapperHTML = (params: WrapperHTMLParams) => {
  const {
    styleLinks = [],
    scriptLinks = [],
    cspSource,
    content,
    title = "",
  } = params;

  const styleLinksHTML = styleLinks.map(
    (l) => `<link href="${l}" rel="stylesheet">`
  );

  const nonce = getNonce();

  const scriptLinksHTML = scriptLinks.map(
    (l) => `<script nonce="${nonce}" src="${l}"></script>`
  );

  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource}; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${styleLinksHTML}

    <title>${title}</title>
  </head>
  <body>
    ${content}

    ${scriptLinksHTML}
  </body>
  </html>`;
};

export function getHtml(webview: vscode.Webview, extensionUri: vscode.Uri, content: { title: string; body: string; scripts?: string, styles?: string }) {
    const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'));

    const nonce = getNonce();

    return /*html*/`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};">
            <link href="${codiconsUri}" rel="stylesheet" />
            <style>
            ${content.styles || ''}
            </style>
            <title>${content.title}</title>
        </head>
        <body>
            ${content.body}
            <script nonce="${nonce}">
                const vscode = acquireVsCodeApi();
                (function() {
                    ${content.scripts || ''}
                })();
            </script>
        </body>
        </html>
    `;
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

interface WrapperHTMLParams {
  styleLinks?: vscode.Uri[];
  scriptLinks?: vscode.Uri[];
  cspSource: string;
  content: string;
  title?: string;
}
