import { resolve, dirname } from 'path'
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { defineNuxtModule } from '@nuxt/kit'

import logger from 'consola'
import type { ViteDevServer } from 'vite';
import { cleanupManifests, installDevMiddleware, moveOutputFile, rollupBuildPlugin, rollupPlugin } from './build';

export interface ModuleOptions {
  entryPoint: string | false;
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt3-service-worker',
    configKey: 'serviceWorker',
    compatibility: {
      nuxt: '^3.4.0'
    }
  },
  defaults: {
    entryPoint: false
  },
  setup (options, nuxt) {
    if (!options.entryPoint) {
      logger.info('Service worker entry point is not set, no routes will be generated');
      return;
    }

    if (nuxt.options.builder === '@nuxt/webpack-builder') {
      logger.error('Service worker module supports only Vite/Rollup build stack');
      process.exit(1);
    }

    const resolvedEntry = resolve(nuxt.options.rootDir, options.entryPoint);
    if (!existsSync(resolvedEntry)) {
      throw new Error('Service worker entry point does not exists: ' + resolvedEntry);
    }

    const plugin = rollupPlugin(nuxt.options.dev);
    nuxt.hook('vite:extendConfig', (config) => {
      config.plugins ||= [];
      config.plugins.push(plugin);
    });

    nuxt.hook('prepare:types', (ev) => {
      const typesFile = resolve(dirname(fileURLToPath(import.meta.url)), 'runtime.d.ts');
      ev.references.push({ path: typesFile });
    });

    if (nuxt.options.dev) {
      let server: ViteDevServer;
      nuxt.hook('vite:serverCreated', (srv: ViteDevServer, ctx) => {
        if (ctx.isClient) {
          server = srv;
        }
      });

      installDevMiddleware(() => server, resolvedEntry);
    } else {
      const buildPlugin = rollupBuildPlugin(resolvedEntry);
      nuxt.hook('vite:extendConfig', ({ plugins }, env) => { if (env.isClient) { plugins?.push(buildPlugin); } });

      nuxt.hook('nitro:build:before', async (ev) => {
        await moveOutputFile(buildPlugin, ev);
        await cleanupManifests(ev.options.buildDir, nuxt.options.rootDir, resolvedEntry);
      });
    }
  }
});
