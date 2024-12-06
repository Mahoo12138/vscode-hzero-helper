export const vscode = acquireVsCodeApi();

export class VSCodeMessenger {
  private readonly listeners = new Map<string, (data: any) => void>();

  constructor() {
    window.addEventListener('message', (event) => {
      const { type, data } = event.data;
      console.log('event', event);
      const listener = this.listeners.get(type);
      if (listener) {
        listener(data);
        this.listeners.delete(type); // 自动清除处理器
      }
    });
  }

  sendMessage<T>(type: string, payload?: any): Promise<T> {
    return new Promise((resolve) => {
      this.listeners.set(`${type}Response`, resolve);
      vscode.postMessage({ type, data: payload });
    });
  }
}



// async function getPermissionFiles() {
//   const fileItems = await messenger.sendMessage<PermissionTreeItem>('getPermissionFiles');
//   console.log('Received file items:', fileItems);
// }
