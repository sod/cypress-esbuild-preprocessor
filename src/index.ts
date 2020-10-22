import * as path from "path";
import * as fs from "fs";
import { FSWatcher } from "fs";

const bundles = new Map<string, Promise<string>>();
const watching = new Set<string>();

export interface CypressFileObject {
  filePath: string;
  outputPath: string;
  shouldWatch: boolean;
}

export type CypressPlugin = (
  file: CypressFileObject & NodeJS.EventEmitter
) => Promise<string>;

export interface CypressPreprocessorOptions {
  additionalEntries?: string[];
}

export interface CallbackPreprocessorAdapterOptions {
  entryPoints: string[];
  outfile: string;
}

export interface CallbackPreprocessorAdapter {
  build: (options: CallbackPreprocessorAdapterOptions) => Promise<void>;
  options: CypressPreprocessorOptions;
}

export interface EsbuildPreprocessorAdapterOptions {
  resolveExtensions?: string[]; // default [".ts", ".js", ".mjs", ".json"]
  minify?: boolean; // default false
  bundle?: boolean; // default true
}

export function esbuildPreprocessorAdapter(
  options: Partial<
    EsbuildPreprocessorAdapterOptions & CypressPreprocessorOptions
  > = {}
): CallbackPreprocessorAdapter {
  const { build } = require("esbuild");

  return {
    build({ entryPoints, outfile }): Promise<void> {
      return build({
        entryPoints,
        outfile,
        resolveExtensions: [".ts", ".js", ".mjs", ".json"],
        minify: false,
        bundle: true,
        ...options,
      }).then(() => undefined);
    },
    options,
  };
}

export function cypressPreprocessor(
  adapter: CallbackPreprocessorAdapter
): CypressPlugin {
  return (file) => {
    const filePath = file.filePath;
    let promise = bundles.get(filePath);

    if (promise) {
      return promise;
    }

    const outfile =
      path.extname(file.outputPath) === ".js"
        ? file.outputPath
        : `${file.outputPath}.js`;
    const entryPoints = [filePath].concat(
      adapter.options.additionalEntries || []
    );

    if (file.shouldWatch) {
      watch(filePath, {
        onInit: (watcher) => file.on("close", () => watcher.close()),
        onChange: () => file.emit("rerun"),
      });
    }

    promise = adapter
      .build({ entryPoints, outfile })
      .then(() => {
        bundles.delete(filePath);
        return outfile;
      })
      .catch((error) => {
        bundles.delete(filePath);
        throw error;
      });

    bundles.set(filePath, promise);

    return promise;
  };
}

export function cypressEsbuildPreprocessor(
  options: Partial<
    EsbuildPreprocessorAdapterOptions & CypressPreprocessorOptions
  > = {}
): CypressPlugin {
  return cypressPreprocessor(esbuildPreprocessorAdapter(options));
}

function watch(
  file: string,
  callback: { onChange: () => void; onInit: (emitter: FSWatcher) => void }
) {
  if (watching.has(file)) {
    return;
  }

  const emitter = fs.watch(file, { encoding: null }, (event) => {
    if (event === "change") {
      callback.onChange();
    }
  });

  callback.onInit(emitter);

  watching.add(file);

  emitter.on("close", () => {
    watching.delete(file);
  });

  emitter.on("error", (error) => {
    console.error(error);
    watching.delete(file);
  });
}
