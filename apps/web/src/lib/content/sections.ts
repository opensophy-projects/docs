import type { ContentItem, ContentSectionLink, ContentSectionConfig } from '$lib/config/navigation';
import { parseNamedContentPath, type _NamedContentKind } from '$lib/content/naming';
import { mergeSectionUiConfig, type SectionUiConfig } from '$lib/config/content-ui';
import { parseContentSource } from '$lib/content/frontmatter';
import { getCustomPage } from '$lib/content/custom-pages';
import {
	flattenNavigationToManifest,
	getAdjacentItems,
	getHref,
	getItemBySlug
} from '$lib/content/manifest';
import GithubSlugger from 'github-slugger';
import type { Component } from 'svelte';

export type ContentSectionId = string;

export type ContentMetadata = {
	href: string;
	slug: string;
	title: string;
	description?: string;
	sourceType: 'svx' | 'svelte';
};

export type ContentTocHeading = {
	id: string;
	text: string;
	level: number;
};

export type ContentModule = {
	default: Component;
	metadata?: Record<string, unknown>;
};

function basePathFor(id: string): string {
	return `/${id}`;
}

// Glob-импорты контента
const allSvxRaw = import.meta.glob<string>('/src/lib/content/**/*.svx', {
	query: '?raw',
	eager: true,
	import: 'default'
});

const allSvxModules = import.meta.glob<ContentModule>('/src/lib/content/**/*.svx', {
	eager: true
});

const allSvelteModules = import.meta.glob<ContentModule>('/src/lib/content/**/*.svelte', {
	eager: true
});

const allSvelteMetadatas = import.meta.glob<Record<string, unknown>>(
	'/src/lib/content/**/*.svelte',
	{
		eager: true,
		import: 'metadata'
	}
);

const allPaths = [...Object.keys(allSvxRaw), ...Object.keys(allSvelteModules)];

/**
 * Карта slug секции -> реальный путь директории в файловой системе.
 * Например: "docs" -> "/src/lib/content/[N]Документация{docs}"
 * Строится из [N]-директорий верхнего уровня content/.
 */
const sectionDirMap = buildSectionDirMap();

function buildSectionDirMap(): Map<string, string> {
	const map = new Map<string, string>();

	for (const path of allPaths) {
		// Ищем [N]-директории верхнего уровня: /src/lib/content/[N]Title{slug}/...
		const sectionDirRegex = /^\/src\/lib\/content\/(\[N\][^/]+)\//;
		const match = sectionDirRegex.exec(path);
		if (!match) continue;

		const dirName = match[1];
		const parsed = parseNamedContentPath(dirName);
		if (parsed?.kind !== 'section') continue;

		const dirPath = `/src/lib/content/${dirName}`;
		if (!map.has(parsed.slug)) {
			map.set(parsed.slug, dirPath);
		}
	}

	return map;
}

// Автоматическое обнаружение секций контента из [N]-директорий
function discoverContentSections(): ContentSectionConfig[] {
	const sections: ContentSectionConfig[] = [];

	for (const [slug, dirPath] of sectionDirMap) {
		const nav = generateNavigationFromSection(slug, dirPath);
		if (nav.items.length === 0) continue;

		sections.push({
			id: slug,
			label: nav.name,
			navigation: nav.items,
			description: nav.description
		});
	}

	return sections;
}

function generateNavigationFromSection(
	sectionId: string,
	sectionDirPath: string
): { name: string; description?: string; items: ContentItem[] } {
	const items: ContentItem[] = [];
	const categories = new Map<string, { item: ContentItem; path: string }>();
	const processedSlugs = new Set<string>();

	for (const path of allPaths) {
		if (!path.startsWith(sectionDirPath + '/')) continue;
		if (!path.endsWith('.svx') && !path.endsWith('.svelte')) continue;

		const filename = path.split('/').pop() ?? '';
		const parsed = parseNamedContentPath(filename);

		let slug: string;
		let name: string;

		// Извлекаем иерархию категорий из пути
		const pathParts = path.split('/');
		const categoryHierarchy: { title: string; slug: string }[] = [];

		for (const part of pathParts) {
			const partParsed = parseNamedContentPath(part);
			if (partParsed?.kind === 'category') {
				categoryHierarchy.push({
					title: partParsed.title,
					slug: partParsed.slug
				});
			}
		}

		if (parsed) {
			if (parsed.kind === 'page') {
				slug = parsed.slug;
				name = parsed.title;
			} else {
				continue; // Пропускаем директории секций/категорий
			}
		} else {
			// Устаревшее именование — извлекаем из пути
			slug = filename.replace(/\.(svx|svelte)$/, '');
			if (slug === 'index') slug = '';
			name = slugToDisplay(slug || 'index');
		}

		if (processedSlugs.has(slug)) continue;
		processedSlugs.add(slug);

		// Получаем заголовок из frontmatter, если есть
		const rawSource = allSvxRaw[path];
		if (rawSource) {
			const { metadata } = parseContentSource(rawSource);
			if (metadata.title) name = metadata.title;
			else if (metadata.name) name = metadata.name;
		}

		const item: ContentItem = { slug, name };

		if (categoryHierarchy.length === 0) {
			items.push(item);
		} else {
			buildCategoryHierarchy(items, categories, categoryHierarchy, item);
		}
	}

	// Получаем название секции из имени [N]-директории
	const sectionDirName = sectionDirPath.split('/').pop() ?? sectionId;
	const sectionParsed = parseNamedContentPath(sectionDirName);
	const sectionLabel = sectionParsed?.title ?? slugToDisplay(sectionId);

	return { name: sectionLabel, items };
}

/**
 * Строит вложенную иерархию категорий произвольной глубины
 */
function buildCategoryHierarchy(
	rootItems: ContentItem[],
	categories: Map<string, { item: ContentItem; path: string }>,
	hierarchy: { title: string; slug: string }[],
	pageItem: ContentItem
): void {
	if (hierarchy.length === 0) {
		rootItems.push(pageItem);
		return;
	}

	const currentLevel = hierarchy[0];
	const categoryPath = hierarchy.map(h => h.slug).join('/');

	if (!categories.has(categoryPath)) {
		const categoryItem: ContentItem = {
			slug: currentLevel.slug,
			name: currentLevel.title,
			items: []
		};
		categories.set(categoryPath, { item: categoryItem, path: categoryPath });

		if (hierarchy.length === 1 || !categories.has(hierarchy.slice(0, -1).map(h => h.slug).join('/'))) {
			rootItems.push(categoryItem);
		} else {
			const parentPath = hierarchy.slice(0, -1).map(h => h.slug).join('/');
			const parent = categories.get(parentPath);
			if (parent?.item.items) {
				parent.item.items.push(categoryItem);
			}
		}
	}

	const category = categories.get(categoryPath);
	if (category) {
		if (hierarchy.length === 1) {
				category.item.items ??= [];
			category.item.items.push(pageItem);
		} else {
			buildCategoryHierarchy(
				category.item.items ?? [],
				categories,
				hierarchy.slice(1),
				pageItem
			);
		}
	}
}

function slugToDisplay(slug: string): string {
	return slug
		.replace(/[-_]/g, ' ')
		.replace(/\b\w/g, c => c.toUpperCase());
}

// Автоматически обнаруженные секции
const autoDiscoveredSections = discoverContentSections();

const contentSectionsById = Object.fromEntries(
	autoDiscoveredSections.map((section) => [section.id, section])
) as Record<ContentSectionId, ContentSectionConfig>;

const contentSectionOrder: ContentSectionId[] = autoDiscoveredSections.map((section) => section.id);

const contentManifests = Object.fromEntries(
	autoDiscoveredSections.map((section) => [section.id, flattenNavigationToManifest(section.navigation)])
) as Record<ContentSectionId, ContentItem[]>;

function findSvxKey(sectionId: string, slug: string): string | null {
	const sectionDirPath = sectionDirMap.get(sectionId);
	if (!sectionDirPath) return null;

	for (const path of Object.keys(allSvxModules)) {
		if (!path.startsWith(sectionDirPath + '/')) continue;

		const filename = path.split('/').pop() ?? '';
		const parsed = parseNamedContentPath(filename);

		if (parsed?.kind === 'page' && parsed.slug === slug) {
			return path;
		}

		// Резерв для устаревшего именования
		if (!parsed) {
			const fileSlug = filename.replace(/\.svx$/, '');
			if (fileSlug === slug || (slug === '' && fileSlug === 'index')) {
				return path;
			}
		}
	}

	return null;
}

function findSvelteKey(sectionId: string, slug: string): string | null {
	const sectionDirPath = sectionDirMap.get(sectionId);
	if (!sectionDirPath) return null;

	for (const path of Object.keys(allSvelteModules)) {
		if (!path.startsWith(sectionDirPath + '/')) continue;

		const filename = path.split('/').pop() ?? '';
		const parsed = parseNamedContentPath(filename);

		if (parsed?.kind === 'page' && parsed.slug === slug) {
			return path;
		}

		// Резерв для устаревшего именования
		if (!parsed) {
			const fileSlug = filename.replace(/\.svelte$/, '');
			if (fileSlug === slug || (slug === '' && fileSlug === 'index')) {
				return path;
			}
		}
	}

	return null;
}

export function getContentSectionConfig(sectionId: ContentSectionId) {
	return contentSectionsById[sectionId];
}

export function getContentSectionUiConfig(sectionId: ContentSectionId): SectionUiConfig {
	const section = contentSectionsById[sectionId];
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	return mergeSectionUiConfig(section?.ui);
}

export function getContentSectionLinks(order: ContentSectionId[] = contentSectionOrder) {
	return order.map((sectionId): ContentSectionLink => {
		const section = contentSectionsById[sectionId];
		return {
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			label: section?.label ?? sectionId,
			href: basePathFor(sectionId),
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			description: section?.description
		};
	});
}

export function getContentSectionManifest(sectionId: ContentSectionId) {
	return contentManifests[sectionId] ?? [];
}

export function getContentSectionSlug(sectionId: ContentSectionId, pathname: string) {
	return pathToSlug(basePathFor(sectionId), pathname);
}

export function getContentSectionMetadata(
	sectionId: ContentSectionId,
	pathname: string
): ContentMetadata | null {
	const section = contentSectionsById[sectionId];
	const normalizedPath = normalizePath(pathname);
	const slug = pathToSlug(basePathFor(sectionId), normalizedPath);
	const svxKey = findSvxKey(sectionId, slug);
	const svelteKey = findSvelteKey(sectionId, slug);

	const customPage = getCustomPage(sectionId, slug);
	if (!svxKey && !svelteKey && !customPage) {
		return null;
	}

	const navItem = getItemBySlug(contentManifests[sectionId] ?? [], slug);
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	const fallbackTitle = slugToTitle(slug) ?? section?.label ?? sectionId;
	let title = navItem?.name ?? fallbackTitle;
	let description: string | undefined;
	const sourceType: ContentMetadata['sourceType'] = svxKey ? 'svx' : 'svelte';

	if (svxKey) {
		const rawSource = allSvxRaw[svxKey];
		if (rawSource) {
			const { metadata } = parseContentSource(rawSource);
			title = metadata.title ?? metadata.name ?? title;
			description = metadata.description;
		}
	} else if (customPage) {
		title = customPage.title ?? title;
		description = customPage.description;
	} else if (svelteKey) {
		const meta = allSvelteMetadatas[svelteKey];
		title =
			(typeof meta.name === 'string' ? meta.name : undefined) ??
			(typeof meta.title === 'string' ? meta.title : undefined) ??
			title;
		description = typeof meta.description === 'string' ? meta.description : undefined;
	}

	return {
		href: normalizedPath,
		slug,
		title,
		description,
		sourceType
	};
}

export function getContentSectionModule(
	sectionId: ContentSectionId,
	slug: string
): ContentModule | null {
	const svxKey = findSvxKey(sectionId, slug);
	if (svxKey) {
		return allSvxModules[svxKey] ?? null;
	}

	const customPage = getCustomPage(sectionId, slug);
	if (customPage) {
		return { default: customPage.component };
	}

	const svelteKey = findSvelteKey(sectionId, slug);
	if (svelteKey) {
		return allSvelteModules[svelteKey] ?? null;
	}

	return null;
}

export function getContentSectionRawSource(
	sectionId: ContentSectionId,
	slug: string
): string | null {
	const svxKey = findSvxKey(sectionId, slug);
	if (!svxKey) return null;
	return allSvxRaw[svxKey] ?? null;
}

export function getContentSectionTocHeadings(
	sectionId: ContentSectionId,
	slug: string,
	selector: string
): ContentTocHeading[] {
	const rawSource = getContentSectionRawSource(sectionId, slug);
	if (!rawSource) return [];

	const { body } = parseContentSource(rawSource);
	return extractTocHeadings(body, selector);
}

export function getContentSectionItemBySlug(sectionId: ContentSectionId, slug: string) {
	return getItemBySlug(contentManifests[sectionId] ?? [], slug);
}

export function getContentSectionAdjacentItems(sectionId: ContentSectionId, slug: string) {
	return getAdjacentItems(contentManifests[sectionId] ?? [], slug);
}

export function getContentSectionHref(sectionId: ContentSectionId, slug: string) {
	return getHref(basePathFor(sectionId), slug);
}

export function getContentSectionRawHref(sectionId: ContentSectionId, slug: string) {
	const prefix = basePathFor(sectionId);
	const normalizedSlug = slug || 'index';
	return `${prefix}/raw/${normalizedSlug}`;
}

export function getContentSectionByPathname(pathname: string) {
	const normalized = normalizePath(pathname);
	const section = Object.values(contentSectionsById).find((s) => {
		const bp = basePathFor(s.id);
		return normalized === bp || normalized.startsWith(`${bp}/`);
	});
	return section ?? null;
}

function slugToTitle(slug: string) {
	return slug
		.split('/')
		.filter(Boolean)
		.map((segment) => segment.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()))
		.join(' - ');
}

function normalizePath(path: string) {
	if (path === '/') return path;
	return path.replace(/\/+$/, '');
}

function pathToSlug(basePath: string, pathname: string) {
	const normalized = normalizePath(pathname);
	if (normalized === basePath || normalized === '') return '';
	const prefix = `${basePath}/`;
	return normalized.startsWith(prefix) ? normalized.slice(prefix.length) : normalized;
}

function extractHeadingLevels(selector: string) {
	const levels = new Set<number>();
	const headingRe = /\bh([1-6])\b/gi;
	let match: RegExpExecArray | null;

	while ((match = headingRe.exec(selector))) {
		levels.add(Number(match[1]));
	}

	return levels.size > 0 ? levels : new Set([2, 3]);
}

function decodeHtmlEntities(value: string) {
	const namedEntities: Record<string, string> = {
		amp: '&',
		lt: '<',
		gt: '>',
		quot: '"',
		apos: "'"
	};

	return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, raw: string) => {
		if (raw.startsWith('#')) {
			const radix = raw[1].toLowerCase() === 'x' ? 16 : 10;
			const codePoint = Number.parseInt(raw.slice(radix === 16 ? 2 : 1), radix);
			return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
		}

		return namedEntities[raw.toLowerCase()] ?? entity;
	});
}

function normalizeHeadingText(rawText: string) {
	return decodeHtmlEntities(
		rawText
			.replace(/\s+#+\s*$/g, '')
			.replace(/\\([\\`*_[\]{}()#+.!|-])/g, '$1')
			.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
			.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
			.replace(/`([^`]*)`/g, '$1')
			.replace(/<[^>]+>/g, '')
			.replace(/\{([^{}]*)\}/g, '$1')
			.replace(/[*_~]/g, '')
			.replace(/\s+/g, ' ')
			.trim()
	);
}

function extractTocHeadings(source: string, selector: string): ContentTocHeading[] {
	const levels = extractHeadingLevels(selector);
	const slugger = new GithubSlugger();
	const headings: ContentTocHeading[] = [];
	let inFence = false;

	for (const line of source.split(/\r?\n/)) {
		if (/^\s*(```|~~~)/.test(line)) {
			inFence = !inFence;
			continue;
		}

		if (inFence) continue;

		const match = /^( {0,3})(#{1,6})\s+(.+?)\s*$/.exec(line);
		if (!match) continue;

		const level = match[2].length;
		if (!levels.has(level)) continue;

		const text = normalizeHeadingText(match[3]);
		if (!text) continue;

		headings.push({
			id: slugger.slug(text),
			text,
			level
		});
	}

	return headings;
}

// Экспорт секций для использования в маршрутах
export { autoDiscoveredSections as contentSections };
