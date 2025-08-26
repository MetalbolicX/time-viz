import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { join } from "node:path";

const dirname = import.meta.dirname ?? ".";

export default defineConfig({
  build: {
    lib: {
      entry: join(dirname, "src", "index.ts"),
      name: "TimeViz",
      formats: ["es", "umd"], // only ESM and UMD for browser/CDN
      fileName: (format) => `time-viz.${format}.js`,
    },
    rollupOptions: {
      external: ["d3"],
      output: {
        globals: {
          d3: "d3",
        },
      },
    },
    outDir: join(dirname, "dist"),
    emptyOutDir: true,
    minify: true,
  },
  plugins: [
    dts({
      entryRoot: "src",
      outDir: "dist/types",
      insertTypesEntry: true,
      cleanVueFileName: true,
    }),
  ],
  server: {
    port: 3000,
    open: true,
  },
});
