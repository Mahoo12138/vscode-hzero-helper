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

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
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
