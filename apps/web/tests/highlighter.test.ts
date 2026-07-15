import { describe, it, expect } from 'vitest';
import { getHighlighter } from '$lib/utils/highlighter';

describe('getHighlighter', () => {
	it('возвращает подсветчик с загруженными темами и языками', () => {
		const highlighter = getHighlighter();

		expect(highlighter).toBeDefined();
		expect(highlighter.codeToHtml('const x = 1;', { lang: 'typescript', theme: 'github-light' })).toContain('<pre');
		expect(highlighter.codeToHtml('const x = 1;', { lang: 'typescript', theme: 'github-dark' })).toContain('<pre');
	});

	it('возвращает тот же экземпляр при повторном вызове (ленивая инициализация)', () => {
		const first = getHighlighter();
		const second = getHighlighter();
		expect(second).toBe(first);
	});
});
