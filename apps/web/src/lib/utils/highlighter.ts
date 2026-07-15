import { createHighlighterCoreSync } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import githubLight from 'shiki/themes/github-light.mjs';
import githubDark from 'shiki/themes/github-dark.mjs';

import typescript from 'shiki/langs/typescript.mjs';
import svelte from 'shiki/langs/svelte.mjs';
import xml from 'shiki/langs/xml.mjs';
import bash from 'shiki/langs/bash.mjs';
import json from 'shiki/langs/json.mjs';
import wgsl from 'shiki/langs/wgsl.mjs';
import markdown from 'shiki/langs/markdown.mjs';
import md from 'shiki/langs/md.mjs';
import html from 'shiki/langs/html.mjs';
import ini from 'shiki/langs/ini.mjs';
import powershell from 'shiki/langs/powershell.mjs';
import ts from 'shiki/langs/ts.mjs';

let highlighter: ReturnType<typeof createHighlighterCoreSync> | null = null;

export function getHighlighter() {
	highlighter ??= createHighlighterCoreSync({
		themes: [githubLight, githubDark],
		langs: [
			typescript,
			svelte,
			xml,
			bash,
			json,
			wgsl,
			markdown,
			md,
			html,
			ini,
			powershell,
			ts
		],
		engine: createJavaScriptRegexEngine()
	});

	return highlighter;
}
