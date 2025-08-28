import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "./src/index.ts",
  format: ["cjs", "es", "umd"],
  platform: "browser",
  minify: true,
  dts: true,
  noExternal: "tipviz",
  outDir: "./dist",
  outputOptions: {
    name: "TimeViz",
    globals: {
      d3: "d3",
    },
  },
});
