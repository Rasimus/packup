import { resolve, toFileUrl } from "./deps.ts";
import { logger } from "./logger_util.ts";
import { build, load } from "https://deno.land/x/esbuild_loader@v0.12.8/mod.ts";
import { denoPlugin } from "./vendor/esbuild_deno_loader/mod.ts";
import { config } from "https://deno.land/x/dotenv/mod.ts";

type Builder = typeof build;
let b: Builder | null = null;
async function loadBuilder(wasmPath: string): Promise<Builder> {
  if (b) {
    return b;
  }
  const start = Date.now();
  const { build } = await load(wasmPath);
  logger.debug(`Esbuild loaded in ${Date.now() - start}ms`);
  b = build;
  return b;
}
export async function bundleByEsbuild(
  path: string,
  wasmPath: string,
): Promise<string> {

  const build = await loadBuilder(wasmPath);

  // insp: https://github.com/evanw/esbuild/issues/69
  const define = {};
  for (const [k, v] of Object.entries(Deno.env.toObject())) {
    define[`process.env.${k}`] = JSON.stringify(v);
  }
  for (const [k, v] of Object.entries(config())) {
    define[`process.env.${k}`] = JSON.stringify(v);
  }

  const bundle = await build({
    entryPoints: [toFileUrl(resolve(path)).href],
    plugins: [
      denoPlugin({
        importMapFile: getImportMap(),
      }),
    ],
    bundle: true,
    define,
  });

  return bundle.outputFiles![0].text;
}

let _importMap: string | undefined;

export function setImportMap(importMap: string) {
  _importMap = importMap;
}

export function getImportMap() {
  return _importMap;
}
