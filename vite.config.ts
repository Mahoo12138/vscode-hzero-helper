import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vscode from '@tomjs/vite-plugin-vscode';
import { createMpaPlugin, createPages } from "vite-plugin-virtual-mpa";


const pages = createPages([
  {
    name: "hzero-panel",
    entry: "/src/pages/hzero-panel/main.ts",
    data: {
      title: "Hzero Panel",
    },
  },
  {
    name: "demo",
    entry: "/src/pages/demo/main.ts",
    data: {
      title: "Demo page",
    },
  },
]);
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag: string) => tag.startsWith('vscode-'),
        },
      },
    }),
    vscode(),
    // Modify the extension source code entry path, and also modify the `index.html` entry file path
    // vscode({ extension: { entry: 'src/index.ts' } }),
    createMpaPlugin({
      template: "src/template.html",
      pages,
      scanOptions: {
        scanDirs: "src/pages",
        entryFile: "main.ts",
        filename: (name) => `${name}.html`,
      },
      htmlMinify: true,
    }),
  ],
});