import { describe, it, expect } from 'vitest';
import {
	mergeSectionUiConfig,
	resolveTocSelector,
	resolveAssistantUrls,
	resolveRepositoryFileUrl,
	sectionUiDefaults
} from '$lib/config/content-ui';

describe('mergeSectionUiConfig', () => {
	it('возвращает дефолтную конфигурацию без overrides', () => {
		const result = mergeSectionUiConfig();
		expect(result.search.enabled).toBe(true);
		expect(result.sidebar.showThemeToggle).toBe(true);
	});

	it('переопределяет скалярные значения', () => {
		const result = mergeSectionUiConfig({ search: { enabled: false } });
		expect(result.search.enabled).toBe(false);
		expect(result.search.maxGroups).toBe(sectionUiDefaults.search.maxGroups);
	});

	it('глубоко сливает вложенные объекты', () => {
		const result = mergeSectionUiConfig({
			search: { hotkey: { key: 'q' } }
		});
		expect(result.search.hotkey.key).toBe('q');
		expect(result.search.hotkey.metaOrCtrl).toBe(true);
	});

	it('заменяет массивы целиком', () => {
		const result = mergeSectionUiConfig({
			toc: { selectorOverrides: [{ slugPrefix: 'test', selector: 'h2' }] }
		});
		expect(result.toc.selectorOverrides).toHaveLength(1);
		expect(result.toc.selectorOverrides[0].slugPrefix).toBe('test');
	});

	it('игнорирует undefined значения', () => {
		const result = mergeSectionUiConfig({ search: { enabled: undefined } });
		expect(result.search.enabled).toBe(true);
	});
});

describe('resolveTocSelector', () => {
	const tocConfig = sectionUiDefaults.toc;

	it('возвращает дефолтный селектор без override', () => {
		expect(resolveTocSelector(tocConfig, 'some-page')).toBe(tocConfig.defaultSelector);
	});

	it('возвращает override-селектор при совпадении slugPrefix', () => {
		expect(resolveTocSelector(tocConfig, 'changelog/1.0.0')).toBe('[data-doc-content] > h2');
	});

	it('возвращает дефолтный селектор при пустом slug', () => {
		expect(resolveTocSelector(tocConfig, '')).toBe(tocConfig.defaultSelector);
	});
});

describe('resolveAssistantUrls', () => {
	const pageActions = sectionUiDefaults.pageActions;

	it('возвращает null/null при отсутствии URL', () => {
		const result = resolveAssistantUrls(pageActions, null);
		expect(result.chatGptUrl).toBeNull();
		expect(result.claudeUrl).toBeNull();
	});

	it('возвращает null/null при отключённых pageActions', () => {
		const result = resolveAssistantUrls(
			{ ...pageActions, enabled: false },
			'https://example.com'
		);
		expect(result.chatGptUrl).toBeNull();
		expect(result.claudeUrl).toBeNull();
	});

	it('формирует URL для ChatGPT и Claude', () => {
		const result = resolveAssistantUrls(pageActions, 'https://example.com/page');
		expect(result.chatGptUrl).toContain('chatgpt.com');
		expect(result.chatGptUrl).toContain(encodeURIComponent('https://example.com/page'));
		expect(result.claudeUrl).toContain('claude.ai');
		expect(result.claudeUrl).toContain(encodeURIComponent('https://example.com/page'));
	});

	it('возвращает null для отключённого ассистента', () => {
		const result = resolveAssistantUrls(
			{
				...pageActions,
				assistants: {
					...pageActions.assistants,
					chatgpt: { ...pageActions.assistants.chatgpt, enabled: false }
				}
			},
			'https://example.com'
		);
		expect(result.chatGptUrl).toBeNull();
		expect(result.claudeUrl).not.toBeNull();
	});
});

describe('resolveRepositoryFileUrl', () => {
	const pageActions = sectionUiDefaults.pageActions;

	it('формирует URL с веткой из конфигурации', () => {
		const result = resolveRepositoryFileUrl(
			pageActions,
			'https://github.com/org/repo',
			'/src/page.svx'
		);
		expect(result).toBe(`https://github.com/org/repo/blob/${pageActions.repositoryBranch}/src/page.svx`);
	});

	it('использует main при пустой ветке', () => {
		const result = resolveRepositoryFileUrl(
			{ ...pageActions, repositoryBranch: '  ' },
			'https://github.com/org/repo',
			'/src/page.svx'
		);
		expect(result).toBe('https://github.com/org/repo/blob/main/src/page.svx');
	});
});
