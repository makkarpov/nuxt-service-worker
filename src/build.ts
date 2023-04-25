import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { isAbsolute, normalize, resolve } from 'path';
import { existsSync } from 'fs';
import { Plugin, ViteDevServer } from 'vite';
import MagicString from 'magic-string';
import { addDevServerHandler } from '@nuxt/kit';
import { Nitro } from 'nitropack';
import { defineEventHandler } from 'h3'
import { init, parse as parseImports } from 'es-module-lexer';

const SERVICE_WORKER_ID = '#service-worker';
const SERVICE_WORKER_URL = 'virtual:serviceWorkerConfig';
const SERVICE_WORKER_LOCATION_TOKEN = '__SERVICE_WORKER_LOCATION__';

export const DEV_SERVICE_WORKER_ROUTE = '/sw.js';

export function installDevMiddleware(serverGetter: () => ViteDevServer, entryPoint: string) {
  addDevServerHandler({
    route: DEV_SERVICE_WORKER_ROUTE,
    handler: defineEventHandler(async({ node: { req, res } }) => {
      const server = serverGetter();
      if (server === undefined) {
        res.writeHead(500);
        res.end('Vite server is not set');
        return;
      }

      const pointUrl = entryPoint + '?worker_file';

      try {
        await server.moduleGraph.ensureEntryFromUrl(pointUrl);
        const code = await readFile(entryPoint, { encoding: 'utf-8' });
        const transformed = await server.pluginContainer.transform(code, pointUrl);

        res.writeHead(200, { 'Content-Type': 'text/javascript' });
        res.end(transformed?.code, 'utf-8');
      } catch (e) {
        console.error(e);
        res.writeHead(500);
        res.end(e.stack);
      }
    })
  });
}

export function rollupPlugin(dev: boolean): Plugin {
  return {
    name: 'service-worker:descriptors',

    resolveId(id: string) {
      // Direct form of identifier ('#xxx') cannot be resolved in dev mode, because it gets stripped in the browser
      // as fragment and never sent to server. So we transform it into more 'canonical' form, which is resolvable.

      if (id === SERVICE_WORKER_ID) {
        return SERVICE_WORKER_URL;
      }
    },

    load(id: string) {
      if (id !== SERVICE_WORKER_URL) {
        return;
      }

      return 'export default ' + JSON.stringify({
        url: dev ? DEV_SERVICE_WORKER_ROUTE : SERVICE_WORKER_LOCATION_TOKEN
      }) + ';';
    }
  }
}

export interface BuildPlugin extends Plugin {
  workerFileName?: string ;
  outputDirectory?: string ;
}

export function rollupBuildPlugin(entryPoint: string): BuildPlugin {
  let chunkRef:string;

  const ret = <BuildPlugin> {
    name: 'service-worker:production',
    workerFileName: undefined,
    outputDirectory: undefined,

    buildStart(options) {
      // First time we will get bogus config: discard it.
      if (!options.plugins) {
        return;
      }

      chunkRef = this.emitFile({
        type: 'chunk',
        id: entryPoint,
        name: 'sw'
      });
    },

    generateBundle(output) {
      ret.outputDirectory = output.dir;
    },

    renderChunk(code: string) {
      if (ret.workerFileName === undefined) {
        ret.workerFileName = this.getFileName(chunkRef);
      }

      if (code.includes(SERVICE_WORKER_LOCATION_TOKEN)) {
        const ms = new MagicString(code, {});
        ms.replace(SERVICE_WORKER_LOCATION_TOKEN, '/' + ret.workerFileName);
        return { code: ms.toString(), map: ms.generateMap({}) };
      }

      return null;
    }
  };

  return ret;
}

export async function transformImports(source: string, resolutionPrefix: string): Promise<string> {
  await init;

  const ms = new MagicString(source);
  const imports = parseImports(source)[0];

  for (const i of imports) {
    if (i.n === undefined || isAbsolute(i.n)) {
      continue;
    }

    const transformed = './' + normalize('.' + resolutionPrefix + i.n);
    ms.overwrite(i.s, i.e, transformed);
  }

  return ms.toString();
}

export async function moveOutputFile({ outputDirectory, workerFileName }: BuildPlugin, nitro: Nitro): Promise<void> {
  const outputDir = resolve(nitro.options.buildDir, 'serviceWorker');
  const nuxtBaseDir = <string> (<any> nitro.options.runtimeConfig.app).buildAssetsDir;
  await mkdir(outputDir);

  const baseFile = resolve(outputDirectory!, workerFileName!);
  await writeFile(
    resolve(outputDir, workerFileName!),
    await transformImports(await readFile(baseFile, { encoding: 'utf-8' }), nuxtBaseDir),
    { encoding: 'utf-8' }
  );

  await rm(baseFile);

  nitro.options.publicAssets.push({
    baseURL: '/',
    dir: outputDir,
    maxAge: 60
  });
}

interface ManifestFile {
  [k: string]: {
    src?: string;
  }
}

export async function cleanupManifests(buildDir: string, rootDir: string, entryPoint: string): Promise<void> {
  async function cleanup(file: string): Promise<boolean> {
    if (!existsSync(file)) { return false; }

    const data = <ManifestFile> JSON.parse(await readFile(file, { encoding: 'utf-8' }));
    let changed = false;

    for (const [k, v] of Object.entries(data)) {
      if (!v.src) {
        continue;
      }

      if (resolve(rootDir, v.src) === entryPoint) {
        delete data[k];
        changed = true;
      }
    }

    if (changed) {
      await writeFile(file, JSON.stringify(data, null, 2), { encoding: 'utf-8' });
    }

    return changed;
  }

  await cleanup(resolve(buildDir, 'dist/client/manifest.json'));

  const serverFile = resolve(buildDir, 'dist/server/client.manifest.json');
  if (await cleanup(serverFile)) {
    const data = 'export default ' + await readFile(serverFile, { encoding: 'utf-8' }) + ';';
    await writeFile(resolve(buildDir, 'dist/server/client.manifest.mjs'), data, { encoding: 'utf-8' });
  }
}
