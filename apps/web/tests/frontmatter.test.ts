import { describe, it, expect } from 'vitest';
import { parseContentSource } from '$lib/content/frontmatter';

describe('parseContentSource', () => {
	it('парсит frontmatter с title и description', () => {
		const raw = `---
title: Моя страница
description: Описание страницы
---
# Контент`;

		const result = parseContentSource(raw);
		expect(result.metadata).toEqual({
			title: 'Моя страница',
			description: 'Описание страницы'
		});
		expect(result.body).toBe('# Контент');
	});

	it('парсит frontmatter с name', () => {
		const raw = `---
name: Альтернативное имя
---
Контент`;

		const result = parseContentSource(raw);
		expect(result.metadata.name).toBe('Альтернативное имя');
	});

	it('возвращает пустые метаданные без frontmatter', () => {
		const raw = 'Просто контент без frontmatter';
		const result = parseContentSource(raw);
		expect(result.metadata).toEqual({});
		expect(result.body).toBe(raw);
	});

	it('обрезает кавычки вокруг значений', () => {
		const raw = `---
title: "В кавычках"
description: 'Одинарные'
---
Контент`;

		const result = parseContentSource(raw);
		expect(result.metadata.title).toBe('В кавычках');
		expect(result.metadata.description).toBe('Одинарные');
	});

	it('пропускает комментарии и пустые строки в frontmatter', () => {
		const raw = `---
# комментарий
title: Заголовок

description: Описание
---
Контент`;

		const result = parseContentSource(raw);
		expect(result.metadata.title).toBe('Заголовок');
		expect(result.metadata.description).toBe('Описание');
	});

	it('не парсит ключи с недопустимыми символами', () => {
		const raw = `---
title: Заголовок
invalid key: значение
---
Контент`;

		const result = parseContentSource(raw);
		expect(result.metadata.title).toBe('Заголовок');
		expect((result.metadata as Record<string, string>).description).toBeUndefined();
	});

	it('обрабатывает CRLF переводы строк', () => {
		const raw = `---\r\ntitle: Заголовок\r\n---\r\nКонтент`;
		const result = parseContentSource(raw);
		expect(result.metadata.title).toBe('Заголовок');
		expect(result.body).toBe('Контент');
	});
});
