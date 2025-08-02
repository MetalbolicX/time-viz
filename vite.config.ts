import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "TimeViz",
      fileName: "time-viz",
      formats: ["es", "umd"],
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
  server: {
    port: 3000,
    open: true,
  },
});
