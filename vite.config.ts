import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "TimeViz", // global variable for UMD
      fileName: "time-viz",
      formats: ["es", "umd"], // only ESM and UMD for browser/CDN
    },
    rollupOptions: {
      external: ["lit", "d3"],
      output: {
        globals: {
          lit: "Lit",
          d3: "d3",
        },
      },
    },
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
