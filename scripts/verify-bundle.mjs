import { readFileSync } from "node:fs";

const bundle = readFileSync("main.js", "utf8");
const dynamicScriptCreations = bundle.match(/createElement\((["'])script\1\)/g) ?? [];

if (dynamicScriptCreations.length > 0) {
  throw new Error(`Bundle contains ${dynamicScriptCreations.length} dynamic <script> element creation(s).`);
}
