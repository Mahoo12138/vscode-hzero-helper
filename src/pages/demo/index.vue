<script setup lang="ts">

import { computed, onMounted, ref } from 'vue';
import { allComponents, provideVSCodeDesignSystem } from '@vscode/webview-ui-toolkit';
import '@vscode/codicons/dist/codicon.css';

import { VSCodeMessenger } from '../../utils';


provideVSCodeDesignSystem().register(allComponents);


const envList = ref<Array<{name: string, host: string}>>([]);
const currentEnv = ref('');
const disabled = computed(() => envList.value.length === 0)

// Example usage
const messenger = new VSCodeMessenger();

const handleEnvChange = async (event: Event) => {
  const select = event.target as HTMLSelectElement;
  const newEnv = select.value;
  await messenger.sendMessage('UPDATE_CURRENT_ENV', { env: newEnv });
  currentEnv.value = newEnv;
};

const handleCreateEnv = () => {
  messenger.sendMessage('CREATE_ENV');
};

onMounted(async () => {
  try {
    // 获取环境列表
    const envData = await messenger.sendMessage<{env: Array<{name: string, host: string}>}>('GET_ENV_LIST');
    console.log('Received env data:', envData);
    envList.value = envData.env || [];
    
    // 获取当前环境
    const currentEnvData = await messenger.sendMessage<string>('GET_CURRENT_ENV');
    console.log('Received current env:', currentEnvData);
    currentEnv.value = currentEnvData || '';
    
    // 如果当前环境为空且有环境列表，设置第一个为当前环境
    if (!currentEnv.value && envList.value.length > 0) {
      const firstEnv = envList.value[0].name;
      await messenger.sendMessage('UPDATE_CURRENT_ENV', { env: firstEnv });
      currentEnv.value = firstEnv;
    }
  } catch (error) {
    console.error('Error loading environment data:', error);
  }
});

const handleScan = () => {
  messenger.sendMessage('scan');
}

</script>

<template>
  <main>
    <div class="container">
      <h2>Hzero Helper</h2>

      <p>Choose env</p>
      <section class="env-selection">
        <div class="option-panel">
          <vscode-dropdown 
            :disabled="disabled" 
            position="below" 
            style="flex: 1"
            :value="currentEnv"
            @change="handleEnvChange"
          >
            <span slot="indicator" class="codicon codicon-settings"></span>
            <vscode-option v-if="disabled">No Env</vscode-option>
            <vscode-option 
              v-else 
              v-for="env in envList" 
              :key="env.name"
              :value="env.name"
            >
              {{ env.name }}
            </vscode-option>
          </vscode-dropdown>
          <vscode-button @click="handleCreateEnv">
            New
          </vscode-button>
        </div>
      </section>

      <p>Common Operation</p>
      <section class="common-operation">

        <vscode-button @click="handleScan">
          Scan Permission
        </vscode-button>
        <vscode-button id="oauthButton">
          Open Hzero Panel
        </vscode-button>
      </section>
    </div>
  </main>
</template>

<style>
.container {
  padding: 10px;
}

.env-selection {
  .option-panel {
    display: flex;
    justify-content: space-between;
    gap: 10px;
  }
}

.common-operation {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>