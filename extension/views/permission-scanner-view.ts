import * as vscode from 'vscode';
import * as path from 'path';

interface Permission {
    code: string;
    type: string;
    meaning: string;
}

interface FilePermissions {
    filePath: string;
    permissions: Permission[];
}

export class PermissionScannerProvider implements vscode.TreeDataProvider<PermissionTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PermissionTreeItem | undefined | null | void> = new vscode.EventEmitter<PermissionTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<PermissionTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private filePermissions: FilePermissions[] = [];

    constructor() { }

    refresh(data: FilePermissions[]): void {
        this.filePermissions = data;
        this._onDidChangeTreeData.fire();
    }

    // 检查是否有数据
    hasData(): boolean {
        return this.filePermissions.length > 0;
    }

    // 获取文件类型的权限项
    getFileItems() {
        return this.filePermissions.map(fp => ({
            label: path.basename(fp.filePath),
            path: fp.filePath,
            type: 'file',
            code: path.basename(fp.filePath, path.extname(fp.filePath)),
            children: fp.permissions.map(perm => ({
                label: perm.code,
                type: 'permission',
                code: perm.code,
                meaning: perm.meaning,
                permissionType: perm.type
            }))
        }));
    }

    getTreeItem(element: PermissionTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: PermissionTreeItem): Thenable<PermissionTreeItem[]> {
        if (!element) {
            // Root level - show files
            return Promise.resolve(
                this.filePermissions.map(
                    fp => new PermissionTreeItem(
                        path.basename(fp.filePath),
                        fp.filePath,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        'file'
                    )
                )
            );
        } else if (element.type === 'file') {
            // File level - show permissions
            const filePermission = this.filePermissions.find(fp => fp.filePath === element.filePath);
            if (!filePermission) {
                return Promise.resolve([]);
            }
            return Promise.resolve(
                filePermission.permissions.map(
                    perm => new PermissionTreeItem(
                        perm.code,
                        element.filePath,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        'permission',
                        perm
                    )
                )
            );
        } else if (element.type === 'permission' && element.permission) {
            // Permission level - show details
            const details = [
                new PermissionTreeItem(
                    `Type: ${element.permission.type}`,
                    element.filePath,
                    vscode.TreeItemCollapsibleState.None,
                    'detail'
                ),
                new PermissionTreeItem(
                    `Meaning: ${element.permission.meaning}`,
                    element.filePath,
                    vscode.TreeItemCollapsibleState.None,
                    'detail'
                )
            ];
            return Promise.resolve(details);
        }
        return Promise.resolve([]);
    }
}

export class PermissionTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly filePath: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly type: 'file' | 'permission' | 'detail',
        public readonly permission?: Permission
    ) {
        super(label, collapsibleState);

        if (type === 'file') {
            this.iconPath = new vscode.ThemeIcon('file');
            this.tooltip = filePath;
            this.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [vscode.Uri.file(filePath)]
            };
        } else if (type === 'permission') {
            this.iconPath = new vscode.ThemeIcon('key');
            this.contextValue = 'permission';
        } else {
            this.iconPath = new vscode.ThemeIcon('info');
        }
    }
}
