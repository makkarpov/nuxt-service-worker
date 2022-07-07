import { defineNuxtConfig } from 'nuxt'
import ServiceWorker from '..'

export default defineNuxtConfig({
  modules: [
    ServiceWorker
  ],
  serviceWorker: {
    entryPoint: 'sw.ts'
  }
})
