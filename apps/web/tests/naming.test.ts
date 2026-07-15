import { describe, it, expect } from 'vitest';
import {
	parseNamedContentPath,
	createNamedContentName,

} from '$lib/content/naming';

describe('parseNamedContentPath', () => {
	it('парсит секцию с slug', () => {
		expect(parseNamedContentPath('[N]Документация{docs}')).toEqual({
			kind: 'section',
			title: 'Документация',
			slug: 'docs'
		});
	});

	it('парсит категорию с slug', () => {
		expect(parseNamedContentPath('[C]Интерфейс{interface}')).toEqual({
			kind: 'category',
			title: 'Интерфейс',
			slug: 'interface'
		});
	});

	it('парсит страницу с slug', () => {
		expect(parseNamedContentPath('[A]Кнопка{button}.svx')).toEqual({
			kind: 'page',
			title: 'Кнопка',
			slug: 'button'
		});
	});

	it('генерирует slug из title при отсутствии {slug}', () => {
		const result = parseNamedContentPath('[N]Документация');
		expect(result).toEqual({
			kind: 'section',
			title: 'Документация',
			slug: 'документация'
		});
	});

	it('возвращает null для некорректного имени', () => {
		expect(parseNamedContentPath('invalid')).toBeNull();
		expect(parseNamedContentPath('[X]Неизвестно')).toBeNull();
	});

	it('обрезает пробелы в title', () => {
		const result = parseNamedContentPath('[N]  Документация  {docs}');
		expect(result?.title).toBe('Документация');
	});
});

describe('createNamedContentName', () => {
	it('создаёт имя секции', () => {
		expect(createNamedContentName('section', 'Документация', 'docs')).toBe(
			'[N]Документация{docs}'
		);
	});

	it('создаёт имя категории', () => {
		expect(createNamedContentName('category', 'Интерфейс', 'interface')).toBe(
			'[C]Интерфейс{interface}'
		);
	});

	it('создаёт имя страницы с расширением .svx', () => {
		expect(createNamedContentName('page', 'Кнопка', 'button')).toBe('[A]Кнопка{button}.svx');
	});

	it('генерирует slug из title если slug не передан', () => {
		expect(createNamedContentName('section', 'Документация')).toBe('[N]Документация{документация}');
	});

	it('slugify заменяет не-буквенно-цифровые символы на дефисы', () => {
		const name = createNamedContentName('page', 'Hello World!');
		expect(name).toBe('[A]Hello World!{hello-world}.svx');
	});
});
