import esbuild from "esbuild";
import process from "node:process";
import { builtinModules } from "node:module";

const builtins = [...builtinModules, ...builtinModules.map((name) => `node:${name}`)];

const production = process.argv[2] === "production";
const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/*", ...builtins],
  format: "cjs",
  target: "es2022",
  logLevel: "info",
  sourcemap: production ? false : "inline",
  minify: production,
  define: { "process.env.NODE_ENV": JSON.stringify(production ? "production" : "development") },
  treeShaking: true,
  outfile: "main.js"
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
