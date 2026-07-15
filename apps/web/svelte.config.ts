import { fileURLToPath, URL } from 'node:url';
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { escapeSvelte, mdsvex } from 'mdsvex';
import { createHighlighter } from 'shiki';
import rehypeSlug from 'rehype-slug';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { type Config } from '@sveltejs/kit';
import type { Root, Element, Text, ElementContent } from 'hast';
import type { Node } from 'unist';

const tableCellFormatter = () => {
	return (tree: Root): void => {
		const ancestors: Element[] = [];

		const visit = (node: Node, parent: Root | Element | null = null, index = 0): void => {
			const isElement = node.type === 'element';
			const isRoot = node.type === 'root';

			if (isElement) {
				ancestors.push(node as Element);
			}

			if (node.type === 'text') {
				const textNode = node as Text;
				if (typeof textNode.value === 'string' && textNode.value.includes('\\|')) {
					const directParent = ancestors[ancestors.length - 1];
					const grandParent = ancestors[ancestors.length - 2];
					const isCodeBlock = directParent.tagName === 'code' && grandParent.tagName === 'pre';

					if (!isCodeBlock) {
						textNode.value = textNode.value.replace(/\\\|/g, '|');
					}
				}
			}

			if (isElement) {
				const el = node as Element;
				if (
					el.tagName === 'code' &&
					Array.isArray(el.children) &&
					el.children.length === 1 &&
					el.children[0].type === 'text'
				) {
					const parentNode = ancestors[ancestors.length - 2];
					const isBlockCode = parentNode.tagName === 'pre';
					const insideTableCell = ancestors.some((ancestor) => {
						if (ancestor === el) return false;
						const a = ancestor;
						return a.tagName === 'td' || a.tagName === 'th';
					});

					const childText = el.children[0];
					let raw = typeof childText.value === 'string' ? childText.value : '';
					if (raw.includes('\\|')) {
						raw = raw.replace(/\\\|/g, '|');
						childText.value = raw;
					}

					if (!isBlockCode && insideTableCell && raw.includes('|') && parent) {
						const parentChildren = parent.children;
						if (Array.isArray(parentChildren)) {
							const segments = raw.split('|').map((segment: string) => segment.trim());
							if (segments.length > 1) {
								const replacements: ElementContent[] = segments.flatMap(
									(segment: string, segmentIndex: number) => {
										const codeNode: Element = {
											type: 'element',
											tagName: 'code',
											properties: el.properties,
											children: [
												{
													type: 'text',
													value: segment
												}
											]
										};

										if (segmentIndex === segments.length - 1) {
											return [codeNode];
										}

										return [codeNode, { type: 'text', value: ' ' }];
									}
								);

								parentChildren.splice(index, 1, ...replacements);
								ancestors.pop();
								replacements.forEach((child: Node, childIndex: number) => {
									visit(child, parent, index + childIndex);
								});
								return;
							}
						}
					}
				}
			}

			const childNodes = isElement || isRoot ? (node as Root | Element).children : [];
			for (let i = 0; i < childNodes.length; i += 1) {
				visit(childNodes[i], node as Root | Element, i);
			}

			if (isElement) {
				ancestors.pop();
			}
		};

		visit(tree);
	};
};

const markdownFeatureFormatter = () => {
	return (tree: Root): void => {
		const visit = (node: Node, parent: Root | Element | null = null, index = 0): void => {
			if (node.type === 'element') {
				const el = node as Element;
				if (el.tagName === 'li' && el.children[0]?.type === 'text') {
					const first = el.children[0];
					const checkboxRegex = /^\s*\[([ xX])]\s+/;
					const match = checkboxRegex.exec(first.value);
					if (match) {
						const checked = match[1].toLowerCase() === 'x';
						el.properties = {
							...el.properties,
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
							class: `${String(el.properties?.class ?? '')} task-list-item`.trim(),
							...(checked ? { 'data-checked': true } : {})
						};
						first.value = first.value.slice(match[0].length);
						el.children.unshift({
							type: 'element',
							tagName: 'input',
							properties: { type: 'checkbox', checked, ariaHidden: true },
							children: []
						});
					}
				}
			}

			if (node.type === 'text' && parent && Array.isArray(parent.children)) {
				const textNode = node as Text;
				const value = textNode.value;
				if (value.includes('~~')) {
					const parts = value.split(/(~~[^~]+~~)/g).filter(Boolean);
					if (parts.length > 1) {
						const replacements: ElementContent[] = parts.map((part) => {
							if (part.startsWith('~~') && part.endsWith('~~')) {
								return {
									type: 'element',
									tagName: 'del',
									properties: {},
									children: [{ type: 'text', value: part.slice(2, -2) }]
								};
							}
							return { type: 'text', value: part };
						});
						parent.children.splice(index, 1, ...replacements);
						return;
					}
				}
			}

			const childNodes =
				node.type === 'element' || node.type === 'root' ? (node as Root | Element).children : [];
			for (let i = 0; i < childNodes.length; i += 1)
				visit(childNodes[i], node as Root | Element, i);
		};
		visit(tree);
	};
};

// Fenced code blocks (``` ... ```, with or without a language, including
// ```markdown blocks used to show ":::chart" as a literal usage example)
// must never have their contents rewritten by transformChartBlocks below.
// We find them up front and swap each one for a placeholder token, so the
// chart-directive regex only ever sees "real" document text — then restore
// the original fenced blocks verbatim afterwards.
const FENCED_CODE_BLOCK = /^([ \t]*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\2[ \t]*$/gm;

function withFencedCodeBlocksProtected(content: string, transform: (text: string) => string) {
	const placeholders: string[] = [];

	const masked = content.replace(FENCED_CODE_BLOCK, (block) => {
		const token = `\u0000FENCED_CODE_BLOCK_${String(placeholders.length)}\u0000`;
		placeholders.push(block);
		return token;
	});

	const transformed = transform(masked);

	return transformed.replace(
		// eslint-disable-next-line no-control-regex
		/\u0000FENCED_CODE_BLOCK_(\d+)\u0000/g,
		(_match, indexStr: string) => placeholders[Number(indexStr)] ?? ''
	);
}

function transformChartBlocks(content: string) {
	return withFencedCodeBlocksProtected(content, (text) =>
		text.replace(/^:::chart\s*\n([\s\S]*?)^:::\s*$/gm, (_match, body: string) => {
			const source = JSON.stringify(body.trim());
			return `<svelte:component this={Reflect.get(globalThis, "__MarkdownChart")} source={${source}} />`;
		})
	);
}







const MARKDOWN_COMPONENTS = ['Admonition', 'Card', 'Cards', 'Chart', 'Columns', 'Faq', 'Katex', 'Step', 'Steps'] as const;

function injectMarkdownComponentImports(content: string, filename: string) {
	// Check if this is a .svx file (use includes() for robustness)
	const isSvx = filename.includes('.svx');
	if (!isSvx) return content;

	// Detect which markdown components are used
	const usedComponents = MARKDOWN_COMPONENTS.filter((component) => {
		const regex = new RegExp(`<${component}(\\s|>|/>)`);
		return regex.test(content);
	});

	if (usedComponents.length === 0) return content;

	// Skip if script block already exists
	const hasExistingScript = /<script[^>]*>[\s\S]*?<\/script>/i.test(content);
	if (hasExistingScript) return content;

	// Build import block
	const importBlock = usedComponents
		.map(
			(component) =>
				`import ${component} from '$lib/components/docs/markdown/${component}.svelte';`
		)
		.join('\n\t');

	const scriptBlock = `<script>\n\t${importBlock}\n</script>\n\n`;

	// Insert after frontmatter if present
	const frontmatterRegex = /^(---[\s\S]*?---\n)/;
		const frontmatterMatch = frontmatterRegex.exec(content);
	if (frontmatterMatch) {
		return frontmatterMatch[1] + scriptBlock + content.slice(frontmatterMatch[0].length);
	}

	return scriptBlock + content;
}

const themes = {
	light: 'github-light',
	dark: 'github-dark'
};
const highlighter = await createHighlighter({
	themes: Object.values(themes),
	langs: [
		'svelte',
		'bash',
		'json',
		'typescript',
		'wgsl',
		'markdown',
		'text',
		'html',
		'ini',
		'md',
		'powershell',
		'ts'
	]
});

const markdownLayout = fileURLToPath(
	new URL('./src/lib/components/docs/MarkdownLayout.svelte', import.meta.url)
);

const mdsvexOptions = {
	extensions: ['.svx'],
	layout: {
		_: markdownLayout
	},
	remarkPlugins: [remarkMath],
	rehypePlugins: [tableCellFormatter, markdownFeatureFormatter, rehypeSlug, rehypeKatex],
	highlight: {
		highlighter: (code: string, lang: string | null = 'text') => {
			const safeLang = lang ?? 'text';
			const lightHtml = escapeSvelte(
				highlighter.codeToHtml(code, {
					lang: safeLang,
					theme: themes.light
				})
			);
			const darkHtml = escapeSvelte(
				highlighter.codeToHtml(code, {
					lang: safeLang,
					theme: themes.dark
				})
			);
			const htmlLightProp = JSON.stringify(lightHtml);
			const htmlDarkProp = JSON.stringify(darkHtml);
			const langProp = JSON.stringify(lang);
			const rawProp = JSON.stringify(code);
			return `<svelte:component this={Reflect.get(globalThis, "__MarkdownPre")} lang={${langProp}} htmlLight={${htmlLightProp}} htmlDark={${htmlDarkProp}} raw={${rawProp}} />`;
		}
	}
};

const config: Config = {
	extensions: ['.svelte', '.svx'],
	preprocess: [
		{
			markup: ({ content, filename = '' }) => ({
				code: injectMarkdownComponentImports(transformChartBlocks(content), filename)
			})
		},
		mdsvex(mdsvexOptions as unknown as Parameters<typeof mdsvex>[0]),
		vitePreprocess()
	],

	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html',
			precompress: false,
			strict: true
		}),
		prerender: {
			handleMissingId: 'ignore'
		},
		typescript: {
			config: (tsConfig: Record<string, string[]>) => {
				const include = tsConfig.include;

				if (include.length) {
					const extraIncludes = ['../eslint.config.ts', '../svelte.config.ts', '../vitest.config.ts'];

					for (const extraInclude of extraIncludes) {
						if (!include.includes(extraInclude)) {
							include.push(extraInclude);
						}
					}
				}

				return tsConfig;
			}
		}
	}
};

export default config;