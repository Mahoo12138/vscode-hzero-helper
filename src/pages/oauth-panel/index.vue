<script setup lang="ts">

import { computed, onMounted, onUnmounted, ref } from 'vue';


import { VSCodeMessenger } from '../../utils';


type Status = 'logout' | 'onlogin' | 'login' | 'error'

const status = ref<Status>('logout');
const buttonText = computed(() => {
  if (status.value === 'logout' || status.value === 'error') {
    return 'Login to Hzero';
  }
  if (status.value === 'onlogin') {
    return 'Opening browser for login...'
  }
  return 'Login error'
})

const messenger = new VSCodeMessenger();

let unsubscribe = () => { };

onMounted(() => {
  unsubscribe = messenger.on("TOKEN_UPDATE", () => {
    status.value = 'login'
    setTimeout(() => {
      messenger.postMessage('CLOSE_WEBVIEW')
    }, 3000)
  });
});

onUnmounted(() => {
  unsubscribe();
})

const handleLogin = () => {
  messenger.postMessage('login');
  status.value = 'onlogin';
}


</script>


<template>
  <main>
    <h2>Hzero OAuth Login</h2>
    <div id="container">
      <p v-if="status === 'logout'">You are not logged in in the current environment, Click the button below to login
        and get your token:</p>
      <p v-if="status === 'error'">Logging error, you maybe need to re-login.</p>
      <p v-if="status === 'login'">Logging success, the page will be closed automatically.</p>

      <vscode-button v-if="status !== 'login'" class="button" @click="handleLogin" :disabled="status === 'onlogin'">
        <!-- <i class="codicon codicon-sign-in"></i> -->
        {{ buttonText }}
      </vscode-button>
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

#container {
  height: 100%;
  display: flex;
  align-items: center;
  flex-direction: column;
  padding-top: 200px;
}
</style>