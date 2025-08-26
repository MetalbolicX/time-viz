import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { join } from "node:path";

const dirname = import.meta.dirname ?? ".";

export default defineConfig({
  build: {
    lib: {
      entry: join(dirname, "src", "index.ts"),
      name: "TimeViz",
      formats: ["es", "umd", "cjs"], // ESM for modern, UMD for CDN
      fileName: (format) => `time-viz.${format}.js`,
    },
    rollupOptions: {
      external: ["d3"], // Exclude d3 from the bundle
      output: {
        globals: {
          d3: "d3",
        },
      },
    },
    outDir: join(dirname, "dist"),
    emptyOutDir: true,
    minify: true,
    target: "es2022", // Modern output for local dev and CDN
  },
  plugins: [
    dts({
      entryRoot: "src",
      outDir: "dist/types",
    }),
  ],
  server: {
    port: 3000,
    open: true,
  },
});
