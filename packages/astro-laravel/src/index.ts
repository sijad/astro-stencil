import {
  mkdir,
  rename,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration, IntegrationResolvedRoute } from "astro";
import glob from "fast-glob";

import {
  errorHandlerModifier,
  modifyContentMiddleware,
  parseAddressInfo,
  rewriteLinksModifier,
} from "./utils.js";

interface Options {
  output?: string;
  devProxyTarget?: string;
  viewsDirPath?: string;
  publicDirPath?: string;
  devServerTarget?: string;
}

export default function createIntegration({
  output = "./laravel/",
  devProxyTarget,
  publicDirPath = "./public/assets/",
  viewsDirPath = "./resources/views/",
  devServerTarget,
}: Options = {}): AstroIntegration {
  let addr: AddressInfo | undefined = devServerTarget
    ? parseAddressInfo(devServerTarget)
    : undefined;
  let srcDir: string;
  let pubDir: string;
  let routes: IntegrationResolvedRoute[] = [];
  const viewsDir = join(output, viewsDirPath);

  async function createDevTemplate(f: string) {
    const themePath = join(viewsDir, f);

    const tempPhp = `<?php
$__getDev = function() use ($__data) {
  $context = stream_context_create([
    "http" => [
      "method" => "GET",
      "ignore_errors" => true,
      "header" => "by-pass-proxy: 1\\r\\n"
    ]
  ]);

  $base = 'http://${addr!.address}:${addr!.port}';
  $path = '/${f}';

  $code = file_get_contents($base . $path, false, $context);
  $code = str_replace('@vite', '@@vite', $code);

  ob_start();

  try {
    echo Blade::render($code, $__data);
  } catch(Throwable $e) {
    ob_clean();
    header('X-Error-AWP: 1');
    http_response_code(500);
    echo '/* awp-error-start */';
    echo json_encode([
      'message' => $e->getMessage(),
      'file' => '${f}',
      'line' => $e->getLine(),
      'code' => $code,
    ]);
    echo '/* awp-error-end */';
    die;
  }

  echo ob_get_clean();
};

$__getDev();`;

    await mkdir(dirname(themePath), { recursive: true });
    await writeFile(themePath, tempPhp, "utf8");
  }

  async function createDevTemplates() {
    const phpAstroFiles = await glob(
      join(srcDir, "pages/**/*.blade.php.astro"),
    );
    const templates = phpAstroFiles.map((f) =>
      relative(join(srcDir, "/pages"), f).slice(0, -6),
    );

    const promises = templates.map(async (f) => {
      await createDevTemplate(f);
    });

    // const pubFiles = await glob(join(pubDir, "*"), { onlyFiles: false });
    // pubFiles.forEach((f) => {
    //   const fileName = basename(f);
    //   const outPath = join(publicDirPath, fileName);
    //
    //   promises.push(symlink(f, outPath));
    // });

    await Promise.all(promises);
  }

  return {
    name: "astro-laravel",
    hooks: {
      "astro:config:setup": ({ updateConfig, addMiddleware }) => {
        updateConfig({
          output: "static",
          build: {
            format: "file",
          },
        });

        addMiddleware({
          entrypoint: "astro-laravel/lib/middleware.js",
          order: "pre",
        });
      },
      "astro:config:done": ({ setAdapter, config }) => {
        srcDir = fileURLToPath(config.srcDir);
        pubDir = fileURLToPath(config.publicDir);
        setAdapter({
          name: "astro-laravel",
          entrypointResolution: "auto",
          adapterFeatures: {
            edgeMiddleware: false,
            buildOutput: "static",
          },
          supportedAstroFeatures: {
            staticOutput: "stable",
            serverOutput: "unsupported",
            hybridOutput: "unsupported",
            sharpImageService: "unsupported",
          },
        });
      },
      "astro:server:setup": async ({ server, logger }) => {
        if (!devProxyTarget) {
          logger.warn(
            "astro-laravel requires the `devProxyTarget` option for development mode. Skipping.",
          );
          return;
        }

        const config = server.config;

        config.server.proxy = config.server.proxy || {};
        config.server.proxy["/"] = {
          target: devProxyTarget,
          changeOrigin: true,
          autoRewrite: true,
          secure: false,
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.removeHeader("Accept-Encoding");
            });
          },
          bypass(req) {
            const url = req.url;

            if (!url) {
              return;
            }

            if (
              req.headers["by-pass-proxy"] ||
              url.startsWith("/src") ||
              url.startsWith("/@") ||
              url.startsWith("/node_modules")
            ) {
              return url;
            }
          },
        };

        server.middlewares.use(
          modifyContentMiddleware([
            rewriteLinksModifier(new URL(devProxyTarget)),
            errorHandlerModifier(server.ws.send.bind(server.ws)),
          ]),
        );

        await rm(viewsDir, { recursive: true, force: true });
        await mkdir(viewsDir, { recursive: true });

        server.watcher.on("all", async (event, entry) => {
          const relPath = relative(join(srcDir, "pages"), entry);

          // check if file is .php.astro and inside src/pages/
          if (
            entry.endsWith(".blade.php.astro") &&
            relPath === basename(entry)
          ) {
            const phpPath = relPath.slice(0, -6);

            if (event === "add" || event === "change") {
              await createDevTemplate(phpPath);
            } else if (event === "unlink") {
              await rm(join(viewsDir, basename(phpPath)), { force: true });
            }
          } else if (
            // check if entry is inside public dir
            relative(pubDir, entry) === basename(entry)
          ) {
            // const themePath = join(publicDirPath, basename(entry));
            // if (event === "add" || event === "addDir") {
            //   await symlink(entry, themePath);
            // } else if (event === "unlink" || event === "unlinkDir") {
            //   await unlink(themePath);
            // }
          }
        });
      },
      "astro:server:start": async ({ address }) => {
        if (!addr) {
          addr = address;
        }

        await createDevTemplates();
      },
      "astro:routes:resolved": ({ routes: _routes }) => {
        routes = _routes;
      },
      "astro:build:done": async ({ dir: _dir, assets }) => {
        const dir = fileURLToPath(_dir);

        await rm(viewsDir, { recursive: true, force: true });
        await rename(dir, viewsDir);

        for (const route of routes) {
          const dists = assets.get(route.pattern);

          if (!dists) {
            continue;
          }

          for (const dist of dists) {
            const path = fileURLToPath(dist);

            if (route.type !== "page" || !path.endsWith(".blade.php.html")) {
              continue;
            }

            const themePath = join(viewsDir, relative(dir, path));
            const finalName = themePath.slice(0, -5);

            await rename(themePath, finalName);
          }
        }
      },
    },
  };
}
