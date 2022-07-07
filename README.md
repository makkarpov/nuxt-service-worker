# nuxt-service-worker

Simple module that configures build system to bundle and expose service worker script at website root path.

Targets at and supports only Vite/Rollup tooling.

## Usage:

Install this package:

```
npm install --save-dev @makkarpov/nuxt-service-worker
```

Configure worker script entry point in your Nuxt configuration, e.g.:

```ts
export default defineNuxtConfig({
  modules: [
      '@makkarpov/nuxt-service-worker'
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
