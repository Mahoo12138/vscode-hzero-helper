// Exports class singleton to prevent multiple invocations of acquireVsCodeApi.
// @ts-ignore
export const vscode = acquireVsCodeApi<any>();