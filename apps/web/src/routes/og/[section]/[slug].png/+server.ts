import { error } from '@sveltejs/kit';
import ImageResponse from '@takumi-rs/image-response';
import type { RequestHandler } from './$types';
import {
	getContentSectionConfig,
	getContentSectionMetadata,
	siteConfig
} from '$lib';
import { contentSections, getContentSectionManifest } from '$lib/content/sections';

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

	return result;
};

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const MAX_TITLE_LENGTH = 88;
const MAX_DESCRIPTION_LENGTH = 180;

type TakumiElement = {
	type: string;
	props: Record<string, unknown>;
	key: string | null;
};

type TakumiChild = TakumiElement | string;

const el = (
	type: string,
	props: Record<string, unknown> = {},
	...children: TakumiChild[]
): TakumiElement => ({
	type,
	key: null,
	props:
		children.length === 0
			? props
			: {
					...props,
					children: children.length === 1 ? children[0] : children
				}
});

const clampText = (value: string, maxLength: number) => {
	const text = value.trim();
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength - 1).trimEnd()}…`;
};

export const GET: RequestHandler = async ({ params }) => {
	const { section: sectionId, slug } = params;

	const pathname = `/${sectionId}/${slug}`;
	const metadata = getContentSectionMetadata(sectionId, pathname);
	if (!metadata) {
		error(404, 'Document not found');
	}

	const sectionConfig = getContentSectionConfig(sectionId);
	const category = sectionConfig.label;
	const title = clampText(metadata.title, MAX_TITLE_LENGTH);
	const description = clampText(
		metadata.description ?? siteConfig.description,
		MAX_DESCRIPTION_LENGTH
	);

	const canonicalOrigin = new URL(siteConfig.url).origin;
	const pageUrl = new URL(metadata.href, canonicalOrigin).href;

	const component = el(
		'div',
		{
			style: {
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
				width: '100%',
				height: '100%',
				padding: 40,
				background: '#ffffff',
				fontFamily: 'Inter, sans-serif'
			}
		},
		el(
			'div',
			{
				style: {
					display: 'flex',
					alignItems: 'flex-start',
					justifyContent: 'space-between'
				}
			},
			el('div', {
				style: {
					display: 'flex',
					fontSize: 28,
					fontWeight: 500,
					color: '#d4a017',
					letterSpacing: '-0.02em'
				}
			}, siteConfig.name),
			el(
				'div',
				{
					style: {
						display: 'flex',
						fontSize: 22,
						color: '#8a8f98',
						fontWeight: 400
					}
				},
				pageUrl
			)
		),
		el(
			'div',
			{
				style: {
					display: 'flex',
					flexDirection: 'column',
					gap: 24
				}
			},
			el(
				'div',
				{
					style: {
						display: 'flex',
						fontSize: 21,
						letterSpacing: '0.06em',
						textTransform: 'uppercase',
						color: '#8a8f98',
						fontWeight: 400
					}
				},
				category
			),
			el(
				'div',
				{
					style: {
						display: 'flex',
						maxWidth: 1060,
						fontSize: 88,
						lineHeight: 0.99,
						color: '#111318',
						fontWeight: 500
					}
				},
				title
			),
			el(
				'div',
				{
					style: {
						display: 'flex',
						maxWidth: 1020,
						fontSize: 32,
						lineHeight: 1.28,
						color: '#5f6672',
						fontWeight: 400
					}
				},
				description
			)
		)
	);

	const response = new ImageResponse(component, {
		width: OG_WIDTH,
		height: OG_HEIGHT,
		format: 'png',
		headers: {
			'content-type': 'image/png',
			'cache-control': 'public, max-age=3600'
		}
	});

	await response.ready;
	return response;
};
