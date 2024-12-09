import { createApp } from 'vue';
import { allComponents, provideVSCodeDesignSystem } from '@vscode/webview-ui-toolkit';
import '@vscode/codicons/dist/codicon.css';
import App from './index.vue';

provideVSCodeDesignSystem().register(allComponents);
createApp(App).mount('#app');