<script lang="ts">
	import './layout.css';
	import 'katex/dist/katex.min.css';
	import { page } from '$app/state';
	import { CommandPalette, contentUiDefaults, siteConfig } from '$lib';
	import { getContentSectionByPathname, getContentSectionUiConfig } from '$lib/content/sections';
	import type { SectionUiConfig } from '$lib/config/content-ui';
	import { type Snippet } from 'svelte';

	const { children }: { children: Snippet } = $props();

	const currentPage = page;

	const isHomePath = (path?: string) => path === '/';

	const currentUrl = $derived(currentPage.url);
	const currentPath = $derived(currentUrl.pathname);
	const isHomeRoute = $derived(isHomePath(currentPath));
	const currentSection = $derived(getContentSectionByPathname(currentPath));
	const currentSectionUi = $derived(
		currentSection ? getContentSectionUiConfig(currentSection.id) : null
	);
	const searchConfig = $derived<SectionUiConfig['search']>(
		currentSectionUi?.search ?? contentUiDefaults.search
	);
	const siteOrigin = new URL(siteConfig.url).origin;
	const canonicalUrl = $derived(new URL(currentPath, siteOrigin).href);

	const siteName = siteConfig.name;
	const authorName = siteConfig.author;
	const homeTitle = `${siteConfig.name} — Шаблон документации`;
	const homeDescription = siteConfig.description;
	const homeKeywords = siteConfig.keywords.join(', ');
	const sharedOgImage = new URL(siteConfig.ogImage, siteOrigin).href;
	const homeStructuredData = $derived.by(() =>
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'WebSite',
			name: siteName,
			alternateName: siteConfig.shortName,
			url: canonicalUrl,
			description: homeDescription,
			image: sharedOgImage,
			author: {
				'@type': 'Organization',
				name: authorName,
				url: siteOrigin
			},
			potentialAction: {
				'@type': 'SearchAction',
				target: `${siteOrigin}/docs?q={search_term_string}`,
				'query-input': 'required name=search_term_string'
			}
		})
	);

	const organizationStructuredData = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: siteConfig.name,
		url: siteOrigin,
		logo: `${siteOrigin}/light_logo.png`,
		sameAs: [siteConfig.links.github],
		contactPoint: {
			'@type': 'ContactPoint',
			email: siteConfig.links.email,
			contactType: 'customer service'
		}
	});
</script>

<svelte:head>
	<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
	<meta name="theme-color" content="#090909" media="(prefers-color-scheme: dark)" />
	<meta name="docs-package-manager-storage-key" content={contentUiDefaults.packageManager.storageKey} />
	<meta name="docs-package-manager-default" content={contentUiDefaults.packageManager.default} />
	<meta
		name="docs-package-manager-enabled"
		content={contentUiDefaults.packageManager.enabled.join(',')}
	/>
	<meta property="og:site_name" content={siteName} />
	<meta property="og:locale" content="ru_RU" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:site" content="@yourhandle" />
	<link rel="manifest" href="/site.webmanifest" />
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
	<meta name="apple-mobile-web-app-title" content={siteName} />
	<meta name="application-name" content={siteName} />
	{#if isHomeRoute}
		<title>{homeTitle}</title>
		<meta name="description" content={homeDescription} />
		<meta name="keywords" content={homeKeywords} />
		<meta name="author" content={authorName} />
		<link rel="canonical" href={canonicalUrl} />
		<meta property="og:title" content={homeTitle} />
		<meta property="og:description" content={homeDescription} />
		<meta property="og:type" content="website" />
		<meta property="og:url" content={canonicalUrl} />
		<meta property="og:image" content={sharedOgImage} />
		<meta property="og:image:alt" content={siteName} />
		<meta property="og:image:type" content="image/jpeg" />
		<meta property="og:image:width" content="1200" />
		<meta property="og:image:height" content="630" />
		<meta name="twitter:title" content={homeTitle} />
		<meta name="twitter:description" content={homeDescription} />
		<meta name="twitter:image" content={sharedOgImage} />
		<svelte:element this={'script'} type="application/ld+json">
			{homeStructuredData}
		</svelte:element>
		<svelte:element this={'script'} type="application/ld+json">
			{organizationStructuredData}
		</svelte:element>
	{:else if !currentSection}
		<title>{homeTitle}</title>
		<meta name="description" content={siteConfig.fallbackDescription} />
		<link rel="canonical" href={canonicalUrl} />
		<meta property="og:title" content={homeTitle} />
		<meta property="og:description" content={siteConfig.fallbackDescription} />
		<meta property="og:type" content="website" />
		<meta property="og:url" content={canonicalUrl} />
		<meta property="og:image" content={sharedOgImage} />
		<meta name="twitter:title" content={homeTitle} />
		<meta name="twitter:description" content={homeDescription} />
		<meta name="twitter:image" content={sharedOgImage} />
	{/if}
</svelte:head>

<CommandPalette {searchConfig} />
{@render children()}
