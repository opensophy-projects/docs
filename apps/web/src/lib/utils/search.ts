import { contentUiDefaults, type SectionUiConfig } from '$lib/config/content-ui';
import { parseContentSource } from '$lib/content/frontmatter';
import { parseNamedContentPath } from '$lib/content/naming';

type ContentSearchEntry = {
	title: string;
	slug: string;
	heading?: string;
	anchor?: string;
	matchType: 'title' | 'heading' | 'content';
	score: number;
	level?: number;
	content?: string;
	snippet?: string;
};

const slugify = (value: string) =>
	value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

// Удаляет HTML-теги без catastrophic backtracking (не допускает вложенных кавычек внутри тега)
function stripHtmlTags(content: string): string {
	return content.replace(/<[a-zA-Z/][^<>]*>/g, ' ');
}

// Заменяет **жирный** или __жирный__ текст его содержимым
function stripBold(content: string): string {
	return content.replace(/\*\*([^*]*)\*\*/g, '$1').replace(/__([^_]*)__/g, '$1');
}

// Заменяет *курсив* или _курсив_ текст его содержимым
function stripItalic(content: string): string {
	return content.replace(/\*([^*]*)\*/g, '$1').replace(/_([^_]*)_/g, '$1');
}

// Заменяет [текст](ссылка) на текст без вложенных скобок в тексте ссылки
function stripLinks(content: string): string {
	return content.replace(/\[([^[\]]+)\]\(([^()]+)\)/g, '$1');
}

function stripMdx(content: string): string {
	let result = content
		.replace(/import\s[^;]+;/g, '')
		.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')
		.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '');

	result = stripHtmlTags(result);

	result = result
		.replace(/```[\s\S]*?```/g, '')
		.replace(/`([^`]+)`/g, '$1');

	result = stripLinks(result);
	result = stripBold(result);
	result = stripItalic(result);

	return result
		.replace(/#{1,6} /g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

function getSnippet(content: string, query: string, maxLength = 100): string {
	const lowerContent = content.toLowerCase();
	const lowerQuery = query.toLowerCase();
	const index = lowerContent.indexOf(lowerQuery);

	if (index === -1) return content.slice(0, maxLength);

	const start = Math.max(0, index - maxLength / 2);
	const end = Math.min(content.length, index + query.length + maxLength / 2);

	let snippet = content.slice(start, end);

	if (start > 0) snippet = '...' + snippet;
	if (end < content.length) snippet += '...';

	return snippet;
}

// Определяет slug секции из пути файла
function resolveSectionSlugs(
	modules: Record<string, string>
): Map<string, { id: string; label: string }> {
	const sectionSlugs = new Map<string, { id: string; label: string }>();

	for (const path in modules) {
		const match = /^\/src\/lib\/content\/(\[N\][^/]+)\//.exec(path);
		if (!match) continue;

		const parsed = parseNamedContentPath(match[1]);
		if (parsed?.kind === 'section' && !sectionSlugs.has(parsed.slug)) {
			sectionSlugs.set(parsed.slug, { id: parsed.slug, label: parsed.title });
		}
	}

	return sectionSlugs;
}

// Преобразует части пути файла в slug-сегменты (только секция и страница, без категорий)
function resolvePathParts(pathParts: string[]): { sectionId: string; pageSlug: string } {
	let sectionId = '';
	let pageSlug = '';

	for (const part of pathParts) {
		const parsed = parseNamedContentPath(part);
		if (!parsed) continue;

		if (parsed.kind === 'section') {
			sectionId = parsed.slug;
		} else if (parsed.kind === 'page') {
			pageSlug = parsed.slug;
		}
	}

	return { sectionId, pageSlug };
}

// Генерирует уникальный anchor для заголовка с учётом дублей
function resolveUniqueSlug(baseSlug: string, slugCounts: Map<string, number>): string {
	const count = slugCounts.get(baseSlug);

	if (typeof count === 'number') {
		const next = count + 1;
		slugCounts.set(baseSlug, next);
		return `${baseSlug}-${String(next)}`;
	}

	slugCounts.set(baseSlug, 0);
	return baseSlug;
}

// Индексирует заголовки и контент одного файла
function indexFileContent(
	lines: string[],
	title: string,
	slug: string,
	index: ContentSearchEntry[]
): void {
	let currentHeading: string | undefined = undefined;
	let currentAnchor = '';
	let currentContentBuffer: string[] = [];
	const slugCounts = new Map<string, number>();
	let untitledSectionCount = 0;

	const flushBuffer = () => {
		if (currentContentBuffer.length === 0) return;

		const text = stripMdx(currentContentBuffer.join(' '));
		if (text.length > 10) {
			index.push({
				title,
				slug,
				heading: currentHeading ?? title,
				anchor: currentAnchor,
				matchType: 'content',
				content: text,
				score: 0
			});
		}
		currentContentBuffer = [];
	};

	const headingRegex = /^(#{2,4}) ([^\r\n]+)/;

	for (const line of lines) {
		const headingMatch = headingRegex.exec(line);

		if (headingMatch) {
			flushBuffer();

			const level = headingMatch[1].length;
			const text = headingMatch[2].trim();
			let baseSlug = slugify(text);

			if (!baseSlug) {
				untitledSectionCount += 1;
				baseSlug = `section-${String(untitledSectionCount)}`;
			}

			const uniqueSlug = resolveUniqueSlug(baseSlug, slugCounts);
			const anchor = `#${uniqueSlug}`;

			currentHeading = text;
			currentAnchor = anchor;

			index.push({ title, slug, heading: text, anchor, matchType: 'heading', score: 0, level });
		} else {
			const trimmed = line.trim();
			if (trimmed && !trimmed.startsWith('import') && !trimmed.startsWith('---')) {
				currentContentBuffer.push(line);
			}
		}
	}

	flushBuffer();
}

function parseContentIndex(): ContentSearchEntry[] {
	const index: ContentSearchEntry[] = [];

	const modules = import.meta.glob<string>('/src/lib/content/**/*.svx', {
		query: '?raw',
		eager: true,
		import: 'default'
	});

	const sectionSlugs = resolveSectionSlugs(modules);

	for (const path in modules) {
		const rawContent = modules[path];
		if (typeof rawContent !== 'string') continue;

		const { metadata: meta, body: contentBody } = parseContentSource(rawContent);

		const pathParts = path
			.replace(/^\/src\/lib\/content\//, '')
			.replace(/\.svx$/, '')
			.split('/');

		const { sectionId, pageSlug } = resolvePathParts(pathParts);
		const sectionInfo = sectionSlugs.get(sectionId);
		if (!sectionInfo) continue;

		const slug = pageSlug ? `/${sectionInfo.id}/${pageSlug}` : `/${sectionInfo.id}`;

		const title = meta.title ?? meta.name ?? (pageSlug || sectionInfo.label);
		const description = meta.description ?? '';

		index.push({ title, slug, matchType: 'title', score: 0 });

		if (description) {
			index.push({ title, slug, anchor: '', matchType: 'content', content: description, score: 0 });
		}

		indexFileContent(contentBody.split('\n'), title, slug, index);
	}

	return index;
}

const searchIndex = parseContentIndex();

const pageLookup = new Map<string, string>();
searchIndex.forEach((item) => {
	if (item.matchType === 'title') {
		pageLookup.set(item.slug, item.title);
	}
});

// Вычисляет score и snippet для одного элемента индекса
function scoreItem(
	item: ContentSearchEntry,
	normalizedQuery: string,
	query: string
): { score: number; snippet?: string } {
	const titleMatch = item.title.toLowerCase().includes(normalizedQuery);
	const headingMatch = item.heading?.toLowerCase().includes(normalizedQuery);
	const contentMatch = item.content?.toLowerCase().includes(normalizedQuery);

	if (item.matchType === 'title' && titleMatch) {
		const bonus = item.title.toLowerCase().startsWith(normalizedQuery) ? 5 : 0;
		return { score: 10 + bonus };
	}

	if (item.matchType === 'heading' && headingMatch) {
		return { score: 5 };
	}

	if (item.matchType === 'content' && contentMatch) {
		const snippet = item.content ? getSnippet(item.content, query) : undefined;
		return { score: 1, snippet };
	}

	return { score: 0 };
}

type SearchGroup = {
	parent: ContentSearchEntry;
	children: ContentSearchEntry[];
	maxScore: number;
};

// Группирует результаты поиска по slug страницы
function buildSearchGroups(normalizedQuery: string, query: string): Map<string, SearchGroup> {
	const groups = new Map<string, SearchGroup>();

	for (const item of searchIndex) {
		const { score, snippet } = scoreItem(item, normalizedQuery, query);
		if (score === 0) continue;

		if (!groups.has(item.slug)) {
			groups.set(item.slug, {
				parent: {
					title: pageLookup.get(item.slug) ?? item.title,
					slug: item.slug,
					matchType: 'title',
					score: 0
				},
				children: [],
				maxScore: 0
			});
		}

		const group = groups.get(item.slug);
		if (!group) continue;

		if (item.matchType === 'title') {
			group.parent = { ...item, score };
		} else {
			group.children.push({ ...item, score, snippet });
		}

		if (score > group.maxScore) {
			group.maxScore = score;
		}
	}

	return groups;
}

export function searchContent(
	query: string,
	searchConfig: SectionUiConfig['search'] = contentUiDefaults.search
): ContentSearchEntry[] {
	if (!query) return [];

	const normalizedQuery = query.toLowerCase();
	const groups = buildSearchGroups(normalizedQuery, query);

	const sortedGroups = Array.from(groups.values())
		.sort((a, b) => {
			const scoreDiff = b.maxScore - a.maxScore;
			return scoreDiff !== 0 ? scoreDiff : a.parent.title.localeCompare(b.parent.title);
		})
		.slice(0, searchConfig.maxGroups);

	const flatResults: ContentSearchEntry[] = [];

	for (const group of sortedGroups) {
		flatResults.push(group.parent);

		group.children.sort((a, b) => b.score - a.score);
		flatResults.push(...group.children.slice(0, searchConfig.maxChildrenPerGroup));
	}

	return flatResults;
}
