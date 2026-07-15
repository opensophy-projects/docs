import { describe, it, expect } from 'vitest';
import { getCustomPage, customPages } from '$lib/content/custom-pages';

describe('getCustomPage', () => {
	it('возвращает null для отсутствующей страницы', () => {
		expect(getCustomPage('docs', 'missing')).toBeNull();
	});

	it('возвращает null при пустом массиве customPages', () => {
		expect(customPages).toEqual([]);
		expect(getCustomPage('any', 'any')).toBeNull();
	});
});
