const esbuild = require("esbuild");

esbuild
  .build({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    outfile: "dist/extension.js",
    platform: "node",
    target: "node18",
    format: "cjs",
    external: ["vscode"],
    sourcemap: false,
    minify: true,
  })
  .catch(() => process.exit(1));
