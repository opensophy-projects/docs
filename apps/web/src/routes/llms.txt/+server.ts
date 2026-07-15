import type { RequestHandler } from './$types';
import { siteConfig } from '$lib';

export const prerender = true;
import { contentSections } from '$lib/content/sections';
import {
	getContentSectionHref,
	getContentSectionManifest,
	getContentSectionMetadata,
	getContentSectionRawHref,
	type ContentSectionId
} from '$lib/content/sections';

type ContentEntry = {
	sectionId: ContentSectionId;
	sectionLabel: string;
	slug: string;
	fallbackTitle: string;
};

const summary = `${siteConfig.name} — ${siteConfig.description}`;

const overviewParagraphs = [
	`## О проекте ${siteConfig.name}`,
	'',
	siteConfig.description,
	'',
	'## Что это такое?',
	'',
	`${siteConfig.name} — шаблон документации на базе SvelteKit, MDsveX и Tailwind CSS. Предоставляет брендированные сайты документации с навигацией, поиском, подсветкой синтаксиса, тёмной темой и полной SEO-поддержкой.`,
	'',
	'## Основные возможности',
	'',
	'- Автонавигация из структуры файловой системы (без ручной конфигурации)',
	'- Два типа страниц: Markdown (.svx) для контента и .svelte для кастомных страниц',
	'- Иерархические секции и категории через систему имён [N], [C], [A]',
	'- Встроенный поиск с горячей клавишей (Cmd/Ctrl+K)',
	'- Тёмная/светлая тема с сохранением в localStorage',
	'- Автоматическое оглавление из заголовков страницы',
	'- Подсветка синтаксиса Shiki с копированием и метаданными',
	'- Компоненты Markdown: замечания, карточки, колонки, шаги, графики, таблицы',
	'- Полное SEO: Open Graph, Twitter Card, JSON-LD, sitemap.xml, robots.txt, llms.txt',
	'- Переключатель менеджера пакетов (npm/pnpm/yarn) в блоках установки',
	'- Адаптивная мобильная навигация',
	'',
	'## Технологический стек',
	'',
	'- SvelteKit — фреймворк, SSR/SSG, маршрутизация',
	'- MDsveX — Markdown с компонентами Svelte (.svx)',
	'- Tailwind CSS v4 — стилизация, тёмная тема через CSS-переменные',
	'- Shiki — подсветка синтаксиса в блоках кода',
	'- KaTeX — рендеринг математических формул',
	'- carbon-icons-svelte — UI-иконки',
	'',
	'## Руководство для LLM',
	'',
	'LLM-ориентированный Markdown для каждой страницы доступен по адресу `/<section>/raw/<slug>` — это исходный контент без навигационной обёртки.',
	'Используйте `/sitemap.xml` для обнаружения URL и `/robots.txt` для указаний по индексированию.'
];

const buildContentEntry = (origin: string, entry: ContentEntry) => {
	const pagePath = getContentSectionHref(entry.sectionId, entry.slug);
	const metadata = getContentSectionMetadata(entry.sectionId, pagePath);
	const title = metadata?.title ?? entry.fallbackTitle;
	const description = metadata?.description ?? `Страница секции ${entry.sectionLabel}: ${title}.`;
	const rawPath = getContentSectionRawHref(entry.sectionId, entry.slug);
	const link = new URL(rawPath, origin).href;
	return `- [${title}](${link}): ${description}`;
};

const dedupeEntries = (entries: ContentEntry[]) => {
	const map = new Map<string, ContentEntry>();
	for (const entry of entries) {
		const key = `${entry.sectionId}:${entry.slug}`;
		if (!map.has(key)) {
			map.set(key, entry);
		}
	}
	return Array.from(map.values());
};

const buildSection = (title: string, items: string[]) => {
	if (items.length === 0) return [];
	return [`## ${title}`, '', ...items];
};

export const GET: RequestHandler = () => {
	const canonicalOrigin = new URL(siteConfig.url).origin;
	const optionalLinks = [
		`- [GitHub](${siteConfig.links.github}): исходный код, issues и обсуждения.`,
		`- [Пакет](https://www.npmjs.com/package/${siteConfig.package.name}): установка и метаданные релизов.`
	];

	const sectionBlocks = contentSections.flatMap((section) => {
		const entries = dedupeEntries(
			getContentSectionManifest(section.id).map((item) => ({
				sectionId: section.id,
				sectionLabel: section.label,
				slug: item.slug,
				fallbackTitle: item.name
			}))
		);

		return buildSection(
			section.label,
			entries.map((entry) => buildContentEntry(canonicalOrigin, entry))
		);
	});

	const lines = [
		`# ${siteConfig.name}`,
		'',
		`> ${summary}`,
		'',
		...overviewParagraphs,
		'',
		...sectionBlocks,
		'',
		...buildSection('Дополнительно', optionalLinks),
		''
	];

	const body =
		lines
			.join('\n')
			.replace(/\n{3,}/g, '\n\n')
			.trim() + '\n';

	return new Response(body, {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'public, max-age=3600'
		}
	});
};
