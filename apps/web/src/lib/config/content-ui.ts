/**
 * Поддерживаемые менеджеры пакетов в примерах установки.
 */
export const availablePackageManagers = ['npm', 'pnpm', 'bun', 'yarn'] as const;

/**
 * Тип менеджера пакетов, производный от `availablePackageManagers`.
 */
export type PackageManagerOption = (typeof availablePackageManagers)[number];

export type SectionUiConfig = {
	search: {
		enabled: boolean;
		triggerPlaceholder: string;
		dialogPlaceholder: string;
		noResultsLabel: string;
		submitHintLabel: string;
		hotkey: {
			enabled: boolean;
			key: string;
			metaOrCtrl: boolean;
			label: string;
		};
		maxGroups: number;
		maxChildrenPerGroup: number;
	};
	sidebar: {
		navigationLabel: string;
		showThemeToggle: boolean;
		showRepositoryLink: boolean;
		repositoryAriaLabel: string;
	};
	toc: {
		enabled: boolean;
		title: string;
		emptyLabel: string;
		minViewportWidth: number;
		defaultSelector: string;
		selectorOverrides: {
			slugPrefix: string;
			selector: string;
		}[];
	};
	pageActions: {
		enabled: boolean;
		showCopyMarkdown: boolean;
		showRepositoryLink: boolean;
		repositoryLinkLabel: string;
		repositoryBranch: string;
		moreActionsAriaLabel: string;
		copyLabels: {
			desktopIdle: string;
			mobileIdle: string;
			copying: string;
			success: string;
			error: string;
		};
		assistantPromptTemplate: string;
		assistants: {
			chatgpt: {
				enabled: boolean;
				label: string;
				hrefTemplate: string;
			};
			claude: {
				enabled: boolean;
				label: string;
				hrefTemplate: string;
			};
		};
	};
	pagination: {
		enabled: boolean;
		previousLabel: string;
		nextLabel: string;
	};
};

export type DeepPartial<T> = {
	[K in keyof T]?: T[K] extends (infer U)[]
		? DeepPartial<U>[]
		: T[K] extends object
			? DeepPartial<T[K]>
			: T[K];
};

/**
 * Настройки UI по умолчанию для всех секций контента.
 */
export type ContentUiConfig = SectionUiConfig & {
	packageManager: {
		enabled: PackageManagerOption[];
		default: PackageManagerOption;
		storageKey: string;
	};
	theme: {
		storageKey: string;
		defaultMode: 'light' | 'dark' | 'system';
	};
};

/**
 * Настройки UI по умолчанию для всех секций контента.
 */
export const sectionUiDefaults: SectionUiConfig = {
	search: {
		enabled: true,
		triggerPlaceholder: 'Поиск...',
		dialogPlaceholder: 'Поиск...',
		noResultsLabel: 'Ничего не найдено.',
		submitHintLabel: 'Перейти на страницу',
		hotkey: {
			enabled: true,
			key: 'k',
			metaOrCtrl: true,
			label: '⌘ K'
		},
		maxGroups: 20,
		maxChildrenPerGroup: 5
	},
	sidebar: {
		navigationLabel: 'Документация',
		showThemeToggle: true,
		showRepositoryLink: false,
		repositoryAriaLabel: 'Открыть репозиторий'
	},
	toc: {
		enabled: true,
		title: 'Оглавление',
		emptyLabel: 'Нет заголовков',
		minViewportWidth: 1280,
		defaultSelector: '[data-doc-content] > h2, [data-doc-content] > h3',
		selectorOverrides: [{ slugPrefix: 'changelog', selector: '[data-doc-content] > h2' }]
	},
	pageActions: {
		enabled: true,
		showCopyMarkdown: true,
		showRepositoryLink: true,
		repositoryLinkLabel: 'Открыть в GitHub',
		repositoryBranch: 'main',
		moreActionsAriaLabel: 'Дополнительные действия',
		copyLabels: {
			desktopIdle: 'Скопировать как Markdown',
			mobileIdle: 'Скопировать Markdown',
			copying: 'Копирование...',
			success: 'Скопировано!',
			error: 'Ошибка копирования'
		},
		assistantPromptTemplate:
			'Я читаю документацию по адресу {url}. Помоги мне её понять. Мне могут понадобиться пояснения концепций, примеры кода или помощь с вопросами по этой документации.',
		assistants: {
			chatgpt: {
				enabled: true,
				label: 'Открыть в ChatGPT',
				hrefTemplate: 'https://chatgpt.com/?hints=search&prompt={prompt}'
			},
			claude: {
				enabled: true,
				label: 'Открыть в Claude',
				hrefTemplate: 'https://claude.ai/new?q={prompt}'
			}
		}
	},
	pagination: {
		enabled: true,
		previousLabel: 'Предыдущая',
		nextLabel: 'Следующая'
	}
};

/**
 * Централизованные настройки UI для секций контента и хелперов.
 */
export const contentUiDefaults: ContentUiConfig = {
	...sectionUiDefaults,
	packageManager: {
		enabled: ['npm', 'pnpm', 'bun', 'yarn'],
		default: 'npm',
		storageKey: 'docs-package-manager'
	},
	theme: {
		storageKey: 'docs-theme',
		defaultMode: 'system'
	}
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const mergeDeep = <T>(base: T, overrides: DeepPartial<T>): T => {
	if (!isPlainObject(base) || !isPlainObject(overrides)) {
		return overrides as T;
	}

	const result: Record<string, unknown> = { ...base };
	for (const [key, value] of Object.entries(overrides)) {
		if (value === undefined) continue;
		const baseValue = (base as Record<string, unknown>)[key];
		if (Array.isArray(baseValue) && Array.isArray(value)) {
			result[key] = value;
			continue;
		}
		if (isPlainObject(baseValue) && isPlainObject(value)) {
			result[key] = mergeDeep(baseValue, value as DeepPartial<typeof baseValue>);
			continue;
		}
		result[key] = value;
	}

	return result as T;
};

export function mergeSectionUiConfig(
	overrides: DeepPartial<SectionUiConfig> = {}
): SectionUiConfig {
	return mergeDeep(sectionUiDefaults, overrides);
}

/**
 * Заменяет плейсхолдеры `{token}` в шаблоне на переданные значения.
 */
function interpolateTemplate(template: string, variables: Record<string, string>) {
	return template.replace(/\{(\w+)\}/g, (_, key: string) => variables[key] ?? '');
}

/**
 * Определяет CSS-селектор для генерации оглавления по slug страницы.
 */
export function resolveTocSelector(tocConfig: SectionUiConfig['toc'], slug = '') {
	const override = tocConfig.selectorOverrides.find((item) =>
		slug.startsWith(item.slugPrefix)
	);
	return override?.selector ?? tocConfig.defaultSelector;
}

/**
 * Строит ссылки на ИИ-ассистентов (ChatGPT/Claude) для текущей страницы.
 */
export function resolveAssistantUrls(
	pageActionsConfig: SectionUiConfig['pageActions'],
	rawUrl?: string | null
) {
	if (!rawUrl || !pageActionsConfig.enabled) {
		return {
			chatGptUrl: null,
			claudeUrl: null
		};
	}

	const prompt = interpolateTemplate(pageActionsConfig.assistantPromptTemplate, {
		url: rawUrl
	});
	const encodedPrompt = encodeURIComponent(prompt);
	const encodedUrl = encodeURIComponent(rawUrl);
	const templateVars = {
		prompt: encodedPrompt,
		url: rawUrl,
		encodedUrl
	};

	return {
		chatGptUrl: pageActionsConfig.assistants.chatgpt.enabled
			? interpolateTemplate(pageActionsConfig.assistants.chatgpt.hrefTemplate, templateVars)
			: null,
		claudeUrl: pageActionsConfig.assistants.claude.enabled
			? interpolateTemplate(pageActionsConfig.assistants.claude.hrefTemplate, templateVars)
			: null
	};
}

/**
 * Строит прямую ссылку на файл в репозитории.
 */
export function resolveRepositoryFileUrl(
	pageActionsConfig: SectionUiConfig['pageActions'],
	repositoryBaseUrl: string,
	repositoryRelativePath: string
) {
	const branch = pageActionsConfig.repositoryBranch.trim();
	const safeBranch = branch.length > 0 ? branch : 'main';
	return `${repositoryBaseUrl}/blob/${safeBranch}${repositoryRelativePath}`;
}
