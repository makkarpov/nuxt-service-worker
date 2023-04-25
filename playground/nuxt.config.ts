import { defineNuxtConfig } from 'nuxt/config';
import ServiceWorker from '..';

export default defineNuxtConfig({
  modules: [ServiceWorker],
  serviceWorker: {
    entryPoint: 'sw.ts'
  }
});
