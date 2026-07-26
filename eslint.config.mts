import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig(
	globalIgnores([
		"node_modules",
		"dist",
		"coverage",
		"esbuild.config.mjs",
		"version-bump.mjs",
		"main.js",
		"manifest.json",
		"versions.json",
		"package.json",
		"package-lock.json",
		"tsconfig.json",
	]),
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: ["eslint.config.mts"],
				},
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		files: ["tests/**/*.ts"],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
		rules: {
			"obsidianmd/no-nodejs-modules": "off",
		},
	},
	{
		// The visual editor is deeply dynamic and still uses PluginSettingTab's
		// imperative rendering API. Keep this exception scoped to that file.
		files: ["src/settings/settings-tab.ts"],
		rules: {
			"@typescript-eslint/no-deprecated": "off",
			"obsidianmd/settings-tab/prefer-setting-definitions": "off",
		},
	},
);
