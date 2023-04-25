# nuxt-service-worker

A fork of `@makkarpov/nuxt-service-worker` for Nuxt 3.

Simple module that configures build system to bundle and expose service worker script at website root path.

Targets at and supports only Vite/Rollup tooling.

## Usage:

Install this package:

```sh
# NPM
npm install --save-dev nuxt3-service-worker

# Yarn
yarn add --dev nuxt3-service-worker
```

Configure worker script entry point in your Nuxt configuration, e.g.:

```ts
export default defineNuxtConfig({
  modules: [
      'nuxt3-service-worker'
  ],
  serviceWorker: {
      entryPoint: 'lib/worker.ts'
  }
});
```

Use special synthetic import to get information about worker script location:

```ts
import worker from '#service-worker';
await navigator.serviceWorker.register(worker.url, { type: 'module' });
```

When running in dev mode, service worker script will be available as `/sw.js` file. During production build worker script will be chunked and packaged just as everything else, resulting in `/sw-XXXXXXXX.mjs` file lying in your `.output/public` dir.

## Development

- Run `npm run dev:prepare` to generate type stubs.
- Use `npm run dev` to start playground in development mode. 
- Use `npm run dev:build` and `npm run dev:preview` to test production build.
