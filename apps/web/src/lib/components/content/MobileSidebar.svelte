<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onDestroy } from 'svelte';
	import ContentSidebar from '$lib/components/content/ContentSidebar.svelte';
	import TableOfContents from '$lib/components/docs/TableOfContents.svelte';
	import { brandingConfig } from '$lib/config/branding';
	import { contentUiDefaults, type SectionUiConfig } from '$lib/config/content-ui';
	import { getContentSectionLinks, type ContentTocHeading } from '$lib/content/sections';
	import { siteConfig } from '$lib/config/site';
	import { searchState } from '$lib/stores/search.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import Close from 'carbon-icons-svelte/lib/Close.svelte';
	import List from 'carbon-icons-svelte/lib/List.svelte';
	import OpenPanelFilledRight from 'carbon-icons-svelte/lib/OpenPanelFilledRight.svelte';
	import Search from 'carbon-icons-svelte/lib/Search.svelte';
	import type { ContentItem, ContentSectionLink } from '$lib/config/navigation';

	const defaultSectionLinks = getContentSectionLinks();

	const {
		navigation = [],
		navigationLabel = contentUiDefaults.sidebar.navigationLabel,
		basePath = '/',
		showSearch = contentUiDefaults.search.enabled,
		showThemeToggle = contentUiDefaults.sidebar.showThemeToggle,
		showRepositoryLink = contentUiDefaults.sidebar.showRepositoryLink,
		repositoryUrl = siteConfig.links.github,
		repositoryAriaLabel = contentUiDefaults.sidebar.repositoryAriaLabel,
		searchConfig = contentUiDefaults.search,
		sectionLinks = defaultSectionLinks,
		headings = []
	}: {
		navigation?: ContentItem[];
		navigationLabel?: string;
		basePath?: string;
		showSearch?: boolean;
		showThemeToggle?: boolean;
		showRepositoryLink?: boolean;
		repositoryUrl?: string;
		repositoryAriaLabel?: string;
		searchConfig?: SectionUiConfig['search'];
		sectionLinks?: ContentSectionLink[];
		headings?: ContentTocHeading[];
	} = $props();

	let isOpen = $state(false);
	let isVisible = $state(false);
	let tocOpen = $state(false);
	let tocVisible = $state(false);
	let restoreFocusEl: HTMLElement | null = null;
	const canUseDocument = typeof document !== 'undefined';
	const panelId = 'mobile-sidebar-panel';
	const tocPanelId = 'mobile-toc-panel';
	const toggleButtonId = 'mobile-sidebar-toggle';
	const closeButtonId = 'mobile-sidebar-close';
	const tocButtonId = 'mobile-toc-toggle';
	const tocCloseButtonId = 'mobile-toc-close';

	function setBodyOverflow(value: string) {
		if (!canUseDocument) return;
		document.body.style.overflow = value;
	}

	function getPanelElement() {
		if (!canUseDocument) return null;
		const node = document.getElementById(panelId);
		return node instanceof HTMLDivElement ? node : null;
	}

	function _getTocPanelElement() {
		if (!canUseDocument) return null;
		const node = document.getElementById(tocPanelId);
		return node instanceof HTMLDivElement ? node : null;
	}

	function getToggleButton() {
		if (!canUseDocument) return null;
		const node = document.getElementById(toggleButtonId);
		return node instanceof HTMLButtonElement ? node : null;
	}

	function getCloseButton() {
		if (!canUseDocument) return null;
		const node = document.getElementById(closeButtonId);
		return node instanceof HTMLButtonElement ? node : null;
	}

	function getTocButton() {
		if (!canUseDocument) return null;
		const node = document.getElementById(tocButtonId);
		return node instanceof HTMLButtonElement ? node : null;
	}

	function getTocCloseButton() {
		if (!canUseDocument) return null;
		const node = document.getElementById(tocCloseButtonId);
		return node instanceof HTMLButtonElement ? node : null;
	}

	function open() {
		const activeElement =
			canUseDocument && document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;
		restoreFocusEl = activeElement instanceof HTMLElement ? activeElement : getToggleButton();
		setBodyOverflow('hidden');

		if (isVisible) {
			isOpen = true;
			requestAnimationFrame(() => {
				getCloseButton()?.focus();
			});
			return;
		}

		isVisible = true;
		requestAnimationFrame(() => {
			isOpen = true;
			getCloseButton()?.focus();
		});
	}

	function toggle() {
		if (isOpen) {
			close();
			return;
		}

		open();
	}

	function close(options: { restoreFocus?: boolean } = {}) {
		const { restoreFocus = true } = options;
		isOpen = false;
		setBodyOverflow('');

		if (restoreFocus) {
			restoreFocusEl?.focus();
		}

		restoreFocusEl = null;
	}

	function closePanel() {
		close();
	}

	function openToc() {
		const activeElement =
			canUseDocument && document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;
		restoreFocusEl = activeElement instanceof HTMLElement ? activeElement : getTocButton();
		setBodyOverflow('hidden');

		if (tocVisible) {
			tocOpen = true;
			requestAnimationFrame(() => {
				getTocCloseButton()?.focus();
			});
			return;
		}

		tocVisible = true;
		requestAnimationFrame(() => {
			tocOpen = true;
			getTocCloseButton()?.focus();
		});
	}

	function toggleToc() {
		if (tocOpen) {
			closeToc();
			return;
		}

		openToc();
	}

	function closeToc(options: { restoreFocus?: boolean } = {}) {
		const { restoreFocus = true } = options;
		tocOpen = false;
		setBodyOverflow('');

		if (restoreFocus) {
			restoreFocusEl?.focus();
		}

		restoreFocusEl = null;
	}

	function closeTocPanel() {
		closeToc();
	}

	function handleTocTransitionEnd(event: TransitionEvent) {
		if (event.target !== event.currentTarget || event.propertyName !== 'transform') return;
		if (!tocOpen) tocVisible = false;
	}

	function openSearch() {
		searchState.open();
	}

	function getFocusableElements() {
		const panel = getPanelElement();
		if (!panel) return [];
		const selector =
			'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
		return Array.from(panel.querySelectorAll<HTMLElement>(selector)).filter(
			(element) =>
				!element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true'
		);
	}

	function handleTabKey(event: KeyboardEvent) {
		const panel = getPanelElement();
		if (!panel) return;

		const focusable = getFocusableElements();
		if (focusable.length === 0) {
			event.preventDefault();
			return;
		}

		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		const activeElement =
			canUseDocument && document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;

		if (event.shiftKey) {
			if (!activeElement || activeElement === first || !panel.contains(activeElement)) {
				event.preventDefault();
				last.focus();
			}
			return;
		}

		if (!activeElement || activeElement === last || !panel.contains(activeElement)) {
			event.preventDefault();
			first.focus();
		}
	}

	function handleDocumentKeydown(event: KeyboardEvent) {
		if (isOpen) {
			if (event.key === 'Escape') {
				event.preventDefault();
				close();
				return;
			}

			if (event.key === 'Tab') {
				handleTabKey(event);
			}
		}

		if (tocOpen && event.key === 'Escape') {
			event.preventDefault();
			closeToc();
		}
	}

	function handleSidebarTransitionEnd(event: TransitionEvent) {
		if (event.target !== event.currentTarget || event.propertyName !== 'transform') return;
		if (!isOpen) isVisible = false;
	}

	afterNavigate(() => {
		close({ restoreFocus: false });
		closeToc({ restoreFocus: false });
	});

	onDestroy(() => {
		setBodyOverflow('');
	});
</script>

<svelte:document onkeydown={handleDocumentKeydown} />

<div
	class="fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-border bg-background px-4 py-1.5 lg:hidden"
>
	<a
		href={resolve('/')}
		class="inline-flex items-center gap-1 px-2 py-2 text-sm tracking-tight text-foreground transition-colors duration-150 ease-out hover:text-foreground"
	>
		<span class="inline-flex shrink-0 items-center" aria-hidden="true">
			<Logo size={6} />
		</span>
		<span class="font-medium lowercase tracking-tight text-foreground">{brandingConfig.name}</span>
	</a>
	<div class="flex items-center gap-1">
		{#if showSearch}
			<button
				type="button"
				onclick={openSearch}
				class="group transition-scale inset-shadow relative inline-flex size-9 cursor-pointer items-center justify-center rounded-sm bg-background-inset text-foreground duration-150 ease-out active:scale-[0.95]"
				aria-label="Открыть поиск"
			>
				<Search size={16} />
			</button>
		{/if}
		{#if headings.length > 0}
			<button
				id={tocButtonId}
				type="button"
				onclick={toggleToc}
				class="group transition-scale inset-shadow relative inline-flex size-9 cursor-pointer items-center justify-center rounded-sm bg-background-inset text-foreground duration-150 ease-out active:scale-[0.95]"
				aria-label="Оглавление"
			>
				<List size={16} />
			</button>
		{/if}
		<button
			id={toggleButtonId}
			onclick={toggle}
			class="group transition-scale inset-shadow relative inline-flex size-9 cursor-pointer items-center justify-center rounded-sm bg-background-inset text-foreground duration-150 ease-out active:scale-[0.95]"
			aria-label="Открыть меню"
		>
			<OpenPanelFilledRight size={16} />
		</button>
	</div>
</div>

{#if isVisible}
	<div
		class="overlay fixed inset-0 z-50 bg-background-inset/80 backdrop-blur-sm lg:hidden"
		class:active={isOpen}
		onclick={closePanel}
		role="button"
		tabindex="-1"
		onkeydown={(event) => {
			if (event.key === 'Escape') closePanel();
		}}
		aria-label="Закрыть боковую панель"
		aria-hidden={!isOpen}
	></div>

	<div
		id={panelId}
		class="sidebar fixed inset-y-0 right-0 z-50 w-3/4 max-w-sm overflow-hidden border-l border-border bg-background-inset text-foreground-muted lg:hidden"
		class:active={isOpen}
		role="dialog"
		aria-modal="true"
		aria-label={navigationLabel}
		ontransitionend={handleSidebarTransitionEnd}
	>
		<div class="absolute top-0 right-0 flex justify-end p-4">
			<button id={closeButtonId} onclick={closePanel} aria-label="Close menu">
				<Close class="size-6" />
			</button>
		</div>

		<ContentSidebar
			{navigation}
			{navigationLabel}
			{basePath}
			{showSearch}
			{showThemeToggle}
			{showRepositoryLink}
			{repositoryUrl}
			{repositoryAriaLabel}
			{searchConfig}
			{sectionLinks}
		/>
	</div>
{/if}

{#if tocVisible}
	<div
		class="toc-overlay fixed inset-0 z-50 bg-background-inset/80 backdrop-blur-sm lg:hidden"
		class:active={tocOpen}
		onclick={closeTocPanel}
		role="button"
		tabindex="-1"
		onkeydown={(event) => {
			if (event.key === 'Escape') closeTocPanel();
		}}
		aria-label="Close table of contents"
		aria-hidden={!tocOpen}
	></div>

	<!--
		Same bg-background-inset as the nav sidebar panel above (no extra
		opacity/blur layered on top), so both panels render as the exact
		same color. --toc-fade-color is also pinned to that same variable
		so the internal fade-to-background overlays in TableOfContents.svelte
		blend into this exact panel color instead of an unrelated hardcoded one.
	-->
	<div
		id={tocPanelId}
		class="toc-panel fixed inset-y-0 right-0 z-50 flex w-3/4 max-w-sm flex-col overflow-hidden border-l border-border bg-background-inset text-foreground-muted lg:hidden"
		style="--toc-fade-color: var(--color-background-inset);"
		class:active={tocOpen}
		role="dialog"
		aria-modal="true"
		aria-label="Table of contents"
		ontransitionend={handleTocTransitionEnd}
	>
		<div class="flex items-center justify-between p-4">
			<div class="flex items-center gap-2 text-foreground">
				<span class="inline-flex shrink-0 items-center text-accent" aria-hidden="true">
					<List size={18} />
				</span>
				<span class="text-sm font-medium tracking-tight">На этой странице</span>
			</div>
			<button id={tocCloseButtonId} onclick={closeTocPanel} aria-label="Close table of contents">
				<Close class="size-6" />
			</button>
		</div>

		<div class="toc-panel-scroll relative min-h-0 flex-1 overflow-y-auto px-4 pb-4">
			<TableOfContents {headings} maxHeight="100%" />
		</div>
	</div>
{/if}

<style>
	.overlay {
		opacity: 0;
		pointer-events: none;
		transition: opacity 200ms ease-out;
		will-change: opacity;
	}

	.overlay.active {
		opacity: 1;
		pointer-events: auto;
	}

	.sidebar {
		transform: translateX(100%);
		transition: transform 200ms ease-out;
		will-change: transform;
	}

	.sidebar.active {
		transform: translateX(0);
	}

	.toc-overlay {
		opacity: 0;
		pointer-events: none;
		transition: opacity 200ms ease-out;
		will-change: opacity;
	}

	.toc-overlay.active {
		opacity: 1;
		pointer-events: auto;
	}

	.toc-panel {
		transform: translateX(100%);
		transition: transform 200ms ease-out;
		will-change: transform;
	}

	.toc-panel.active {
		transform: translateX(0);
	}

	/* TableOfContents.svelte now owns its own scroll box + top/bottom fade
	   (see maxHeight="100%" above and --toc-fade-color on the panel), so
	   this wrapper no longer needs its own mask-image — that previously
	   produced a slightly different blended color than the plain
	   bg-background-inset used by the nav sidebar panel. */
	.toc-panel-scroll {
		display: flex;
		flex-direction: column;
	}

	/* TableOfContents.svelte renders its own "ON THIS PAGE" heading, which
	   would duplicate the header we already show in this panel. Hide just
	   that first heading row here via CSS only — the component file itself
	   is not modified, so its standalone/desktop usage is unaffected. */
	.toc-panel-scroll :global(nav > div:first-child) {
		display: none;
	}
</style>