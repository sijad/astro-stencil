/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

export default getViteConfig(
  {
    test: {
      environment: "node",
      setupFiles: ["./tests/private/setup.ts"],
      coverage: {
        enabled: false,
        provider: "v8",
        exclude: ["node_modules/", "tests/"],
      },
    },
  },
  {
    mode: "production",
    devToolbar: {
      enabled: false,
    },
    compressHTML: false,
  },
);
