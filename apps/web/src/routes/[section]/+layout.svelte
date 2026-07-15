<script lang="ts">
	import {
		ContentNavigation,
		DocShareActions,
		MobileDocShareActions,
		TableOfContents,
		resolveTocSelector,
		siteConfig
	} from '$lib';
	import ContentSectionLayout from '$lib/components/content/ContentSectionLayout.svelte';
	import {
		getContentSectionConfig,
		getContentSectionHref,
		getContentSectionLinks,
		getContentSectionManifest,
		getContentSectionRawHref,
		getContentSectionUiConfig
	} from '$lib/content/sections';
	import type { SectionUiConfig } from '$lib/config/content-ui';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	const { data, children }: { data: LayoutData; children: Snippet } = $props();

	const sectionId = $derived(data.sectionId);
	const sectionUi = $derived<SectionUiConfig>(getContentSectionUiConfig(sectionId));
	const sectionConfig = $derived(getContentSectionConfig(sectionId));
	const sectionManifest = $derived(getContentSectionManifest(sectionId));
	const sectionBasePath = $derived(`/${sectionId}`);

	const metadata = $derived(data.metadata);
	const docSlug = $derived(metadata?.slug);
	const currentDoc = $derived(sectionManifest.find((d) => d.slug === docSlug));

	const previousLink = $derived(
		data.previousDoc
			? {
					title: data.previousDoc.name,
					href: getContentSectionHref(sectionId, data.previousDoc.slug)
				}
			: null
	);
	const nextLink = $derived(
		data.nextDoc
			? {
					title: data.nextDoc.name,
					href: getContentSectionHref(sectionId, data.nextDoc.slug)
				}
			: null
	);

	const siteOrigin = new URL(siteConfig.url).origin;
	const canonicalUrl = $derived(metadata ? new URL(metadata.href, siteOrigin).href : null);

	const docOgImage = $derived(
		metadata?.sourceType === 'svx'
			? new URL(`/og${data.metadata.href}.png`, siteOrigin).href
			: new URL(siteConfig.ogImage, siteOrigin).href
	);

	const docTitle = $derived(metadata?.title ?? currentDoc?.name ?? siteConfig.name);
	const docDescription = $derived(metadata?.description ?? siteConfig.fallbackDescription);

	const docStructuredData = $derived.by(() => {
		if (!canonicalUrl) return null;
		return JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'TechArticle',
			headline: docTitle,
			description: docDescription,
			url: canonicalUrl,
			author: {
				'@type': 'Person',
				name: siteConfig.author
			},
			publisher: {
				'@type': 'Organization',
				name: siteConfig.name
			},
			mainEntityOfPage: canonicalUrl
		});
	});

	const breadcrumbStructuredData = $derived.by(() => {
		if (!canonicalUrl) return null;
		return JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{
					'@type': 'ListItem',
					position: 1,
					name: 'Home',
					item: siteOrigin
				},
				{
					'@type': 'ListItem',
					position: 2,
					name: sectionConfig.label,
					item: new URL(sectionBasePath, siteOrigin).href
				},
				{
					'@type': 'ListItem',
					position: 3,
					name: docTitle,
					item: canonicalUrl
				}
			]
		});
	});

	const rawDocSlug = $derived(
		metadata
			? metadata.href.replace(new RegExp(`^\\/${sectionId}(?:\\/|$)`), '').replace(/\/+$/, '') ||
					'index'
			: null
	);
	const rawPath = $derived(rawDocSlug ? getContentSectionRawHref(sectionId, rawDocSlug) : null);
	const docOrigin = $derived(data.docOrigin);
	const rawUrl = $derived(rawPath && docOrigin ? new URL(rawPath, docOrigin).href : null);

	const showDocActions = $derived(sectionUi.pageActions.enabled && Boolean(metadata));
	const showToc = $derived(sectionUi.toc.enabled);
	const showRightAside = $derived(sectionUi.toc.enabled || sectionUi.pageActions.enabled);
	const isSvxContent = $derived(metadata?.sourceType === 'svx');
	const innerViewportStyle = $derived(isSvxContent);
	const showPagination = $derived(
		sectionUi.pagination.enabled && (isSvxContent || Boolean(currentDoc?.showPagination))
	);

	const sectionLinks = getContentSectionLinks();
	const sidebarConfig = $derived({
		navigation: sectionConfig.navigation,
		navigationLabel: sectionUi.sidebar.navigationLabel,
		basePath: sectionBasePath,
		showSearch: sectionUi.search.enabled,
		showThemeToggle: sectionUi.sidebar.showThemeToggle,
		showRepositoryLink: sectionUi.sidebar.showRepositoryLink,
		repositoryUrl: siteConfig.links.github,
		repositoryAriaLabel: sectionUi.sidebar.repositoryAriaLabel,
		searchConfig: sectionUi.search,
		sectionLinks
	});

	const tocSelector = $derived(resolveTocSelector(sectionUi.toc, docSlug));
	const mainId = $derived(`${sectionId}-main-content`);
	const scrollContainerId = $derived(`${sectionId}-content-container`);
</script>

<svelte:head>
	<title>{docTitle} - {siteConfig.name}</title>
	<meta name="description" content={docDescription} />

	{#if metadata}
		<link rel="canonical" href={canonicalUrl} />

		<meta property="og:type" content="article" />
		<meta property="og:title" content={docTitle} />
		<meta property="og:description" content={docDescription} />
		<meta property="og:url" content={canonicalUrl} />
		<meta property="og:image" content={docOgImage} />
		<meta property="og:image:alt" content={`${siteConfig.name} documentation`} />
		<meta property="og:image:type" content="image/png" />
		<meta property="og:image:width" content="1200" />
		<meta property="og:image:height" content="630" />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:title" content={docTitle} />
		<meta name="twitter:description" content={docDescription} />
		<meta name="twitter:image" content={docOgImage} />
		{#if docStructuredData}
			<svelte:element this={'script'} type="application/ld+json">
				{docStructuredData}
			</svelte:element>
		{/if}
		{#if breadcrumbStructuredData}
			<svelte:element this={'script'} type="application/ld+json">
				{breadcrumbStructuredData}
			</svelte:element>
		{/if}
	{/if}
</svelte:head>

<ContentSectionLayout
	{mainId}
	{scrollContainerId}
	showAside={showRightAside}
	{innerViewportStyle}
	{sidebarConfig}
	headings={data.tocHeadings}
>
	{#snippet main()}
		<section class="flex min-w-0 flex-1 flex-col space-y-8">
			{#if metadata?.sourceType === 'svx'}
				<div class="space-y-4">
					{#if currentDoc?.category}
						<p class="mb-2 text-sm font-medium tracking-normal text-foreground-muted/70 capitalize">
							{currentDoc.category}
						</p>
					{/if}
					<h1 class="scroll-m-20 text-3xl font-medium tracking-tight text-foreground">
						{metadata.title}
					</h1>
					{#if metadata.description}
						<p class="max-w-4xl text-base font-normal tracking-normal text-foreground-muted">
							{metadata.description}
						</p>
					{/if}

					{#if showDocActions}
						<MobileDocShareActions
							{rawPath}
							{rawUrl}
							pageActionsConfig={sectionUi.pageActions}
						/>
					{/if}
				</div>
				<hr
					class="h-px border-0 bg-border shadow-2xs shadow-white dark:bg-black dark:shadow-border"
				/>
			{/if}

			<div class="flex-1">
				{@render children()}

				<ContentNavigation
					previous={previousLink}
					next={nextLink}
					paginationConfig={sectionUi.pagination}
					enabled={showPagination}
				/>
			</div>
		</section>
	{/snippet}

	{#snippet aside()}
		{#if showRightAside}
			<aside
				class="z-50 hidden max-h-full min-h-0 w-56 flex-col justify-between overflow-hidden py-8 xl:col-start-2 xl:row-start-1 xl:flex 2xl:col-start-3"
				aria-label="Оглавление и действия"
			>
				{#if showToc}
					<div class="min-h-0 flex-1">
						<TableOfContents
							selector={tocSelector}
							headings={data.tocHeadings}
							title={sectionUi.toc.title}
							emptyLabel={sectionUi.toc.emptyLabel}
							minViewportWidth={sectionUi.toc.minViewportWidth}
							{scrollContainerId}
						/>
					</div>
				{/if}
				{#if showDocActions}
					<DocShareActions
						{rawPath}
						{rawUrl}
						pageActionsConfig={sectionUi.pageActions}
					/>
				{/if}
			</aside>
		{/if}
	{/snippet}
</ContentSectionLayout>
