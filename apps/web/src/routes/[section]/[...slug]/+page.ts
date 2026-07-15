import { error, redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { getContentSectionModule, getContentSectionManifest, contentSections } from '$lib/content/sections';

export const prerender = true;

export const entries = () => {
	const result: { section: string; slug: string }[] = [];

	for (const section of contentSections) {
		const manifest = getContentSectionManifest(section.id);
		for (const item of manifest) {
			result.push({
				section: section.id,
				slug: item.slug
			});
		}
	}

	// Также добавляем записи корневых секций для корректного редиректа
	for (const section of contentSections) {
		result.push({ section: section.id, slug: '' });
	}

	return result;
};

export const load: PageLoad = ({ params }) => {
	const { section: sectionId, slug } = params;

	// Редирект с корневого URL секции на первую страницу
	if (!slug) {
		const manifest = getContentSectionManifest(sectionId);
		const first = manifest[0];
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (first) {
			redirect(302, `/${sectionId}/${first.slug}`);
		}
		redirect(302, `/${sectionId}`);
	}

	const mod = getContentSectionModule(sectionId, slug);
	if (!mod) {
		error(404, 'Page not found');
	}

	return {
		component: mod.default,
		slug
	};
};
