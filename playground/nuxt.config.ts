import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  modules: ['../src/module'],
  serviceWorker: {
    entryPoint: 'sw.ts'
  }
});
