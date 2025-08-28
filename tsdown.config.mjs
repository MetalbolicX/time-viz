import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "./src/index.ts",
  format: ["cjs", "es", "umd"],
  platform: "browser",
  minify: true,
  dts: true,
  noExternal: "tipviz",
  tsconfig: true,
  outDir: "./dist",
  fixedExtension: true,
  outputOptions: {
    name: "TimeViz",
    globals: {
      d3: "d3",
    },
  },
});
