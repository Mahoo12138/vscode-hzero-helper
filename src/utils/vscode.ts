export const vscode = acquireVsCodeApi();

export class VSCodeMessenger {
  private readonly listeners = new Map<string, (data: any) => void>();
  private readonly persistentListeners = new Map<string, Array<(data: any) => void>>();

  constructor() {
    window.addEventListener('message', (event) => {
      const { type, data } = event.data;

      // 处理一次性监听器
      const listener = this.listeners.get(type);
      if (listener) {
        listener(data);
        this.listeners.delete(type);
      }

      // 处理持久监听器
      const persistentListenerList = this.persistentListeners.get(type);
      if (persistentListenerList) {
        persistentListenerList.forEach(callback => callback(data));
      }
    });
  }

  sendMessage<T>(type: string, payload?: any): Promise<T> {
    return new Promise<T>((resolve) => {
      this.listeners.set(`${type}_Response`, resolve);
      vscode.postMessage({ type, data: payload, resp: true });
    });
  }

  postMessage(type: string, payload?: any) {
    vscode.postMessage({ type, data: payload });
  }

  // 添加持久监听器，不会自动清除
  on(type: string, callback: (data: any) => void) {
    const existingListeners = this.persistentListeners.get(type) || [];
    existingListeners.push(callback);
    this.persistentListeners.set(type, existingListeners);

    // 返回一个取消监听的方法
    return () => {
      const updatedListeners = (this.persistentListeners.get(type) || [])
        .filter(cb => cb !== callback);

      if (updatedListeners.length > 0) {
        this.persistentListeners.set(type, updatedListeners);
      } else {
        this.persistentListeners.delete(type);
      }
    };
  }
}


// async function getPermissionFiles() {
//   const fileItems = await messenger.sendMessage<PermissionTreeItem>('getPermissionFiles');
//   console.log('Received file items:', fileItems);
// }
