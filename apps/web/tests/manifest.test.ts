import { describe, it, expect } from 'vitest';
import {
	flattenNavigationToManifest,
	getItemBySlug,
	getAdjacentItems,
	getHref
} from '$lib/content/manifest';
import type { ContentItem } from '$lib/config/navigation';

const items: ContentItem[] = [
	{ slug: 'intro', name: 'Введение' },
	{ slug: 'guide', name: 'Гид', category: 'Основное' },
	{ slug: 'api', name: 'API', category: 'Основное' },
	{ slug: 'faq', name: 'FAQ' }
];

describe('flattenNavigationToManifest', () => {
	it('возвращает плоский список без вложенностей', () => {
		const result = flattenNavigationToManifest(items);
		expect(result).toHaveLength(4);
		expect(result.map((i) => i.slug)).toEqual(['intro', 'guide', 'api', 'faq']);
	});

	it('раскрывает вложенные категории', () => {
		const nested: ContentItem[] = [
			{
				slug: 'category',
				name: 'Категория',
				items: [
					{ slug: 'child1', name: 'Потомок 1' },
					{ slug: 'child2', name: 'Потомок 2' }
				]
			},
			{ slug: 'standalone', name: 'Отдельный' }
		];

		const result = flattenNavigationToManifest(nested);
		expect(result).toHaveLength(3);
		expect(result[0].slug).toBe('child1');
		expect(result[0].category).toBe('Категория');
		expect(result[2].slug).toBe('standalone');
	});

	it('передаёт parentCategory потомкам без своей категории', () => {
		const nested: ContentItem[] = [
			{
				slug: 'cat',
				name: 'Категория',
				items: [{ slug: 'child', name: 'Потомок' }]
			}
		];

		const result = flattenNavigationToManifest(nested, 'Родительская');
		expect(result[0].category).toBe('Родительская');
	});
});

describe('getItemBySlug', () => {
	it('находит элемент по slug', () => {
		const result = getItemBySlug(items, 'guide');
		expect(result?.name).toBe('Гид');
	});

	it('возвращает undefined для отсутствующего slug', () => {
		expect(getItemBySlug(items, 'missing')).toBeUndefined();
	});
});

describe('getAdjacentItems', () => {
	it('возвращает предыдущий и следующий элементы', () => {
		const result = getAdjacentItems(items, 'guide');
		expect(result.previous?.slug).toBe('intro');
		expect(result.next?.slug).toBe('api');
	});

	it('возвращает null для первого элемента без предыдущего', () => {
		const result = getAdjacentItems(items, 'intro');
		expect(result.previous).toBeNull();
		expect(result.next?.slug).toBe('guide');
	});

	it('возвращает null для последнего элемента без следующего', () => {
		const result = getAdjacentItems(items, 'faq');
		expect(result.previous?.slug).toBe('api');
		expect(result.next).toBeNull();
	});

	it('возвращает null/null для отсутствующего slug', () => {
		const result = getAdjacentItems(items, 'missing');
		expect(result.previous).toBeNull();
		expect(result.next).toBeNull();
	});
});

describe('getHref', () => {
	it('объединяет basePath и slug', () => {
		expect(getHref('/docs', 'guide')).toBe('/docs/guide');
	});

	it('возвращает basePath при пустом slug', () => {
		expect(getHref('/docs', '')).toBe('/docs');
	});
});
