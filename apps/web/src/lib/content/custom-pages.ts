import type { Component } from 'svelte';

export type CustomPageDefinition = {
	section: string;
	slug: string;
	component: Component;
	title?: string;
	description?: string;
};

export const customPages: CustomPageDefinition[] = [];

export function getCustomPage(section: string, slug: string) {
	return customPages.find((page) => page.section === section && page.slug === slug) ?? null;
}
