<template>
  <div>
    <button @click="registerWorker()">
      Register
    </button>
    <hr>
    <pre>{{ worker }}</pre>
    <pre>{{ registration?.active }}</pre>

    <!-- Include function so it won't be tree-shaken, but hide it from display -->
    <span style="display: none">{{ getMeowingString() }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeMount } from '#imports';
import { getMeowingString } from '~/lib/swHelper'; // to test chunk reuse

import worker from '#service-worker';

const registration = ref<ServiceWorkerRegistration>();

async function registerWorker() {
  registration.value = await navigator.serviceWorker.register(worker.url, {
    type: 'module'
  });
}
</script>

<style>
div.code {
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 4px;
  max-width: 1200px;
  overflow: auto;
  white-space: pre-wrap;
  font-family: monospace;
}
</style>
