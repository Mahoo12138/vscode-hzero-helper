import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { PermissionScannerProvider } from './utils/view/permission-scanner-view';

interface Permission {
    code: string;
    type: string;
    meaning: string;
}

interface FilePermissions {
    filePath: string;
    permissions: Permission[];
}

export class TsxScanner {
    constructor() {}

    private parsePermissionList(match: string): Permission[] {
        try {
            // 提取数组内容，处理多行和空格
            const arrayMatch = match.match(/\[\s*([\s\S]*?)\s*\]/);
            if (!arrayMatch) {
                return [];
            }

            // 分割成单独的对象字符串，处理多行情况
            const objectStrings = arrayMatch[1]
                .split(/}\s*,\s*{/)
                .map(str => str.trim())
                .map(str => str.replace(/^\{/, '').replace(/\}$/, ''))
                .filter(str => str.length > 0);

            return objectStrings.map(objStr => {
                // 使用更宽松的正则表达式来匹配属性
                const codeMatch = objStr.match(/code:\s*[`'"]([^`'"]+)[`'"]/);
                const typeMatch = objStr.match(/type:\s*['"]([^'"]+)['"]/);
                const meaningMatch = objStr.match(/meaning:\s*(?:intl\.get\([^)]*\)\.d\(['"]([^'"]+)['"]\)|['"]([^'"]+)['"])/);

                let code = '';
                if (codeMatch) {
                    // 如果匹配到的是模板字符串，提取后缀部分
                    const templateMatch = codeMatch[1].match(/\$\{[^}]+\}(.*)/);
                    code = templateMatch ? templateMatch[1] : codeMatch[1];
                }

                return {
                    code,
                    type: typeMatch?.[1] || '',
                    meaning: meaningMatch?.[1] || ''
                };
            }).filter(perm => perm.code || perm.type || perm.meaning);
        } catch (error) {
            console.error('Error parsing permission list:', error);
            return [];
        }
    }

    // 扫描指定目录下的所有 .tsx 文件
    private async scanDirectory(dirPath: string): Promise<FilePermissions[]> {
        const results: FilePermissions[] = [];
        const permissionPattern = /permissionList=\{(\[[^\]]+\])\}/g;

        const scanFiles = async (dir: string) => {
            const files = await fs.promises.readdir(dir);

            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = await fs.promises.stat(filePath);

                if (stat.isDirectory()) {
                    await scanFiles(filePath);
                } else if (file.endsWith('.tsx')) {
                    const content = await fs.promises.readFile(filePath, 'utf-8');
                    const matches = Array.from(content.matchAll(permissionPattern));

                    if (matches.length > 0) {
                        const permissions: Permission[] = [];
                        for (const match of matches) {
                            const permList = this.parsePermissionList(match[1]);
                            permissions.push(...permList);
                        }

                        if (permissions.length > 0) {
                            results.push({
                                filePath,
                                permissions
                            });
                        }
                    }
                }
            }
        };

        await scanFiles(dirPath);
        return results;
    }

    // 主扫描方法
    public async scan(treeDataProvider: PermissionScannerProvider) {
        try {
            // 获取当前工作区
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder open');
            }

            // 让用户选择要扫描的文件夹
            const folderUri = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select Folder to Scan'
            });

            if (!folderUri || folderUri.length === 0) {
                return;
            }

            const results = await this.scanDirectory(folderUri[0].fsPath);

            if (results.length === 0) {
                vscode.window.showInformationMessage('No permissions found');
                return;
            }

            // 更新树视图
            treeDataProvider.refresh(results);
            vscode.window.showInformationMessage(`Found permissions in ${results.length} files`);

        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
