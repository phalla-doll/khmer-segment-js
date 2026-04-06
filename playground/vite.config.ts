import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "khmer-segment/dictionary": new URL(
        "./src/dictionary/index.ts",
        `file://${root}`
      ).pathname,
      "khmer-segment": new URL("./src/index.ts", `file://${root}`).pathname,
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
