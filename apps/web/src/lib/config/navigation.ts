import type { DeepPartial, SectionUiConfig } from '$lib/config/content-ui';
import type { Component } from 'svelte';

export type ContentSectionLink = {
	label: string;
	href: string;
	icon?: Component<{ size?: number; class?: string }>;
	description?: string;
};

export type ContentSectionConfig = {
	/**
	 * URL-safe identifier used as the route segment and content directory name.
	 * The base path is derived as `/${id}`.
	 */
	id: string;
	label: string;
	navigation: ContentItem[];
	ui?: DeepPartial<SectionUiConfig>;
	icon?: Component;
	description?: string;
};

export type ContentItem = {
	slug: string;
	name: string;
	category?: string;
	showPagination?: boolean;
	items?: ContentItem[];
};

// Navigation is now auto-generated from file system structure in sections.ts
// Content sections are discovered automatically from [N] named directories
// See docs on naming system: [N] = section, [C] = category, [A] = page
