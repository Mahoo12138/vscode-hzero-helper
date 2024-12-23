<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { VSCodeMessenger } from '../../utils';


interface MenuItem {
  id: string;
  name: string;
  type: string;
  code: string;
  route?: string;
  subMenus?: MenuItem[];
  [key: string]: any;
}

interface PermissionSet {
  id: string;
  code: string;
  name: string;
  permissionType: string;
  controllerTypeMeaning: string;
  [key: string]: any;
}

interface PermissionTreeItem {
  label: string;
  path: string;
  type: 'file' | 'permission';
  code: string;
  meaning?: string;
  children?: PermissionTreeItem[];
  [key: string]: any;
}

interface Env {
  token: string;
  host: string;
}

// 响应式数据
const searchQuery = ref('');
const leftListData = ref<MenuItem[]>([]);
const selectedItem = ref(null);
const permissionSets = ref<PermissionSet[]>([]);
const loading = ref(false);
const loadingPermissions = ref(false);
const env = ref<Env | null>(null);
const importing = ref(false);

const messenger = new VSCodeMessenger();

// 获取token
const getToken = async () => {
  const res = await messenger.sendMessage<Env>('GET_CURRENT_ENV');
  console.log('token', res);
  env.value = res;
};

// 扁平化菜单树
const flattenMenuTree = (menuItems: MenuItem[]): MenuItem[] => {
  const result: MenuItem[] = [];

  const traverse = (items: MenuItem[]) => {
    items.forEach(item => {
      if (item.type === 'menu') {
        result.push(item);
      }
      if (item.subMenus && item.subMenus.length > 0) {
        traverse(item.subMenus);
      }
    });
  };

  traverse(menuItems);
  return result;
};

// 获取权限集列表
const fetchPermissionSets = async (menuId: string) => {
  loadingPermissions.value = true;
  try {
    const response = await fetch(
      `${env.value?.host}/iam/hzero/v1/menus/${menuId}/permission-set?menuId=${menuId}`,
      {
        headers: {
          'Authorization': `bearer ${env.value?.token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('获取权限集失败');
    }

    const data = await response.json();
    permissionSets.value = data;
  } catch (error) {
    messenger.postMessage('SHOW_MESSAGE', {
      level: 'error',
      message: '获取权限集失败：' + (error as Error).message
    });
    permissionSets.value = [];
  } finally {
    loadingPermissions.value = false;
  }
};

// 搜索方法
const handleSearch = async () => {
  if (!env.value?.token) {
    messenger.postMessage('SHOW_MESSAGE', { level: 'error', message: '请先配置Token后再进行查询' })
    return;
  }

  loading.value = true;
  try {
    const response = await fetch(
      `${env.value.host}/iam/hzero/v1/menus/manage-tree?enabledFlag=1&keyword=${encodeURIComponent(searchQuery.value)}&level=organization`,
      {
        headers: {
          'Authorization': `bearer ${env.value.token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Request Data Fail');
    }

    const data = await response.json();
    leftListData.value = flattenMenuTree(data);
  } catch (error) {
    messenger.postMessage('SHOW_MESSAGE', {
      level: 'error',
      message: 'Query Data Fail：' + (error as Error).message
    });
    leftListData.value = [];
  } finally {
    loading.value = false;
  }
};

// 选择左侧列表项
const handleSelectItem = async (item: MenuItem) => {
  selectedItem.value = item;
  if (item?.id) {
    await fetchPermissionSets(item.id);
  }
};

// 格式化权限类型
const formatPermissionType = (type: string) => {
  return type === 'api' ? 'API' : '按钮';
};

// 导入权限
const handleImportPermission = async () => {
  if (!selectedItem.value?.id) {
    messenger.postMessage('SHOW_MESSAGE', {
      level: 'warning',
      message: '请先选择左侧菜单项'
    });
    return;
  }

  importing.value = true;
  try {
    // 1. 检查权限扫描器数据
    const hasData = await messenger.sendMessage<boolean>('CHECK_PERMISSIONS')

    if (!hasData) {
      messenger.postMessage('SHOW_MESSAGE', {
        level: 'warning',
        message: '请先扫描生成权限数据'
      });
      return;
    }

    // 2. 获取文件列表供选择
    const fileItems = await messenger.sendMessage<PermissionTreeItem[]>('GET_PERMISSION_FILES');

    const selectedFile = messenger.sendMessage('SHOW_QUICKPICK', fileItems.map((item: PermissionTreeItem) => ({
      label: item.label,
      description: item.path,
      value: item
    })));



    if (!selectedFile) return;

    // 4. 获取默认权限集编码前缀
    const defaultPermissionSet = permissionSets.value.find(ps => ps.code.endsWith('default'));
    if (!defaultPermissionSet) {
      throw new Error('未找到默认权限集');
    }
    const prefix = defaultPermissionSet.code.replace('.default', '');

    // 5. 格式化并提交权限数据
    const permissions = selectedFile.children?.filter(child => child.type === 'permission') || [];

    for (const permission of permissions) {
      const permissionData = {
        icon: "link",
        type: "ps",
        level: "organization",
        enabledFlag: 1,
        newSubnodeFlag: 1,
        editDetailFlag: 1,
        parentId: selectedItem.value.id,
        name: permission.meaning || permission.label,
        controllerType: "disabled",
        code: `${prefix}.${permission.code}`,
        permissionType: permission.type
      };

      const response = await fetch(`${env.value?.host}/iam/hzero/v1/menus/create`, {
        method: 'POST',
        headers: {
          'Authorization': `bearer ${env.value?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(permissionData)
      });

      if (!response.ok) {
        throw new Error(`Import Error: ${permission.code}`);
      }
    }

    // 6. 刷新权限集列表
    await fetchPermissionSets(selectedItem.value.id);

    messenger.postMessage('SHOW_MESSAGE', {
      level: 'info',
      message: 'Import Success'
    });
  } catch (error) {
    messenger.postMessage('SHOW_MESSAGE', {
      level: 'error',
      message: 'Import Error: ' + (error as Error).message
    });
  } finally {
    importing.value = false;
  }
};

// 初始化获取token
onMounted(() => {
  getToken();
});
</script>

<template>
  <main>
    <!-- 搜索区域 -->
    <div class="search-area">
      <vscode-text-field v-model="searchQuery" placeholder="Input keyword"></vscode-text-field>
      <vscode-button @click="handleSearch" :disabled="loading">
        {{ loading ? 'Searching...' : 'Search' }}
      </vscode-button>
    </div>

    <!-- 列表区域 -->
    <div class="list-container">
      <!-- 左侧列表 -->
      <div class="list left-list">
        <h3>Menu list</h3>
        <div class="list-content">
          <div v-if="loading" class="loading">Loading...</div>
          <template v-else>
            <div v-for="item in leftListData" :key="item.id" class="menu-item"
              :class="{ active: selectedItem?.id === item.id }" @click="handleSelectItem(item)">
              <div class="menu-name">{{ item.name }}</div>
              <div class="menu-route">{{ item.route }}</div>
            </div>
            <div v-if="!loading && leftListData.length === 0" class="empty-text">
              No Data
            </div>
          </template>
        </div>
      </div>

      <!-- 右侧列表 -->
      <div class="list right-list">
        <div class="right-section">
          <div class="section-header">
            <h3>Menu Detail</h3>
            <vscode-button v-if="selectedItem" @click="handleImportPermission" :disabled="importing">
              {{ importing ? 'Importing...' : 'Import PS' }}
            </vscode-button>
          </div>
          <div v-if="selectedItem" class="detail-content">
            <div class="detail-item">
              <span class="label">ID</span>
              <span>{{ selectedItem.id }}</span>
            </div>
            <div class="detail-item">
              <span class="label">name</span>
              <span>{{ selectedItem.name }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Code</span>
              <span>{{ selectedItem.code }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Route</span>
              <span>{{ selectedItem.route }}</span>
            </div>
          </div>
          <div v-else class="empty-text">Need select a menu</div>
        </div>

        <div class="right-section">
          <h3>Permission set</h3>
          <div class="permission-list">
            <div v-if="loadingPermissions" class="loading">Loading...</div>
            <template v-else>
              <table v-if="permissionSets.length > 0" class="permission-table">
                <thead>
                  <tr>
                    <th>PS Code</th>
                    <th>PSName</th>
                    <th>PS Type</th>
                    <th>PS Control Type</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="ps in permissionSets" :key="ps.id">
                    <td>{{ ps.code }}</td>
                    <td>{{ ps.name }}</td>
                    <td>{{ formatPermissionType(ps.permissionType) }}</td>
                    <td>{{ ps.controllerTypeMeaning }}</td>
                  </tr>
                </tbody>
              </table>
              <div v-else class="empty-text">No permission data</div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style>
main {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 16px;
  height: 100vh;
  box-sizing: border-box;
}

.search-area {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.list-container {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.list {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 4px;
  padding: 12px;
  overflow: hidden;
}

.right-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
  flex: 3;
}

.right-section {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.right-section:first-child {
  flex: 0 0 auto;
  max-height: 200px;
}

.right-section:last-child {
  flex: 1;
  min-height: 0;
}

.list-content {
  flex: 1;
  overflow-y: auto;
  margin: 8px -12px 0;
  padding: 0 12px;
}

h3 {
  margin: 0;
  font-size: 14px;
  color: var(--vscode-foreground);
  flex-shrink: 0;
}

.empty-text {
  text-align: center;
  padding: 20px;
  color: var(--vscode-descriptionForeground);
}

.loading {
  text-align: center;
  padding: 20px;
  color: var(--vscode-descriptionForeground);
}

vscode-text-field {
  flex: 1;
}

.menu-item {
  padding: 8px;
  cursor: pointer;
  border-radius: 4px;
  margin-bottom: 4px;
}

.menu-item:hover {
  background-color: var(--vscode-list-hoverBackground);
}

.menu-item.active {
  background-color: var(--vscode-list-activeSelectionBackground);
  color: var(--vscode-list-activeSelectionForeground);
}

.menu-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.menu-route {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  overflow-wrap: break-word;
}

.detail-content {
  padding: 8px 0;
}

.detail-item {
  margin-bottom: 8px;
}

.detail-item .label {
  color: var(--vscode-descriptionForeground);
  margin-right: 8px;
  display: inline-block;
  width: 60px;
}

.permission-list {
  flex: 1;
  overflow-y: auto;
  margin: 8px -12px 0;
  padding: 0 12px;
}

.permission-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.permission-table th,
.permission-table td {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.permission-table th {
  position: sticky;
  top: 0;
  font-weight: 500;
  color: var(--vscode-foreground);
  background-color: var(--vscode-sideBar-background);
  z-index: 1;
}

.permission-table tr:hover {
  background-color: var(--vscode-list-hoverBackground);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-header vscode-button {
  min-width: 80px;
}
</style>