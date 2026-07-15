<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */
	import { type ClassValue } from "clsx";
	import type { Snippet } from "svelte";
	import { cn } from "../../utils/cn";
	import AreaRangeSolid from "carbon-icons-svelte/lib/AreaRangeSolid.svelte";
	import Close from "carbon-icons-svelte/lib/Close.svelte";

	type MenuVariant = "default" | "muted";

	type MenuLink = {
		label: string;
		href: string;
		onclick?: (e: MouseEvent) => void;
	}

	type MenuButton = {
		label: string;
		href: string;
	}

	type MenuGroup = {
		title: string;
		variant?: MenuVariant;
		links: MenuLink[];
	}

	type FloatingMenuClasses = {
		root?: ClassValue;
		overlay?: ClassValue;
		header?: ClassValue;
		toggleButton?: ClassValue;
		actions?: ClassValue;
		primaryButton?: ClassValue;
		secondaryButton?: ClassValue;
		menuWrapper?: ClassValue;
		grid?: ClassValue;
		group?: ClassValue;
		groupMuted?: ClassValue;
		groupTitle?: ClassValue;
		link?: ClassValue;
		linkText?: ClassValue;
		linkUnderline?: ClassValue;
		divider?: ClassValue;
	}

	type Props = {
		menuGroups: MenuGroup[];
		centerContent?: Snippet;
		actionsEnd?: Snippet;
		primaryButton?: MenuButton;
		secondaryButton?: MenuButton;
		class?: string;
		classes?: FloatingMenuClasses;
	}

	let {
		menuGroups,
		centerContent,
		actionsEnd,
		primaryButton,
		secondaryButton,
		class: className,
		classes,
	}: Props = $props();

	let isOpen = $state(false);

	function toggle() {
		isOpen = !isOpen;
	}
</script>

<svelte:body style:overflow={isOpen ? "hidden" : undefined} />

<!-- Backdrop overlay -->
{#if isOpen}
	<div
		data-slot="overlay"
		class={cn(
			"fixed inset-0 z-40 bg-background-inset/90",
			classes?.overlay,
		)}
		onclick={toggle}
		onkeydown={(e) => {
			if (e.key === "Escape") {
				e.preventDefault();
				toggle();
			}
		}}
		role="button"
		tabindex="-1"
		aria-label="Close menu"
	></div>
{/if}

<!-- Floating nav container -->
<div
	data-slot="root"
	class={cn(
		"floating-menu fixed top-2 left-1/2 z-50 w-full max-w-[95vw] -translate-x-1/2 rounded-md border border-border bg-background text-foreground shadow-md md:top-4 md:max-w-[70vw] lg:max-w-[50vw]",
		isOpen && "floating-menu-open",
		className,
		classes?.root,
	)}
>
	<div
		data-slot="header"
		class={cn(
			"relative z-20 flex w-full items-center justify-between px-1 py-1",
			classes?.header,
		)}
	>
		<!-- Left: hamburger toggle with pure CSS animation -->
		<button
			onclick={toggle}
			data-slot="toggle-button"
			data-open={isOpen}
			class={cn(
				"inset-shadow transition-scale relative inline-flex size-9 items-center justify-center rounded-sm bg-background-inset text-foreground duration-150 ease-out active:scale-[0.95]",
				classes?.toggleButton,
			)}
			aria-expanded={isOpen}
			aria-label={isOpen ? "Закрыть меню" : "Открыть меню"}
		>
			<span class="menu-toggle-icon menu-toggle-open">
				<AreaRangeSolid size={16} />
			</span>
			<span class="menu-toggle-icon menu-toggle-close">
				<Close size={16} />
			</span>
		</button>

		<!-- Center: custom content -->
		<div
			class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform-gpu"
			style="backface-visibility: hidden;"
		>
			{#if centerContent}
				<div data-slot="center-content">
					{@render centerContent()}
				</div>
			{/if}
		</div>

		<!-- Right: actions -->
		<div
			data-slot="actions"
			class={cn("flex items-center gap-1", classes?.actions)}
		>
			{#if secondaryButton}
				<a
					href={secondaryButton.href}
					data-slot="secondary-button"
					class={cn(
						"hidden h-9 items-center justify-center rounded-sm px-3 text-xs font-medium text-foreground transition-[background-color,color] duration-300 hover:bg-background-muted md:flex",
						classes?.secondaryButton,
					)}
				>
					{secondaryButton.label}
				</a>
			{/if}
			{#if primaryButton}
				<a
					href={primaryButton.href}
					data-slot="primary-button"
					class={cn(
						"flex h-9 items-center justify-center rounded-sm bg-accent/10 px-3 text-xs font-medium text-accent transition-[background-color] duration-300 hover:bg-accent/20",
						classes?.primaryButton,
					)}
				>
					{primaryButton.label}
				</a>
			{/if}
			{#if actionsEnd}
				{@render actionsEnd()}
			{/if}
		</div>
	</div>

	<!-- Dropdown menu -->
	<div
		data-slot="menu-wrapper"
		class={cn(
			"menu-wrapper w-full overflow-hidden border-t border-border",
			classes?.menuWrapper,
		)}
	>
		<div
			data-slot="grid"
			class={cn(
				"grid max-h-[65vh] grid-cols-1 gap-4 overflow-y-auto overscroll-contain p-4 md:max-h-none md:grid-cols-3 md:overflow-visible",
				classes?.grid,
			)}
		>
			{#each menuGroups as group (group.title)}
				<div
					data-slot="group"
					class={cn(
						"flex flex-col gap-4 rounded-sm p-4 transition-colors",
						group.variant === "muted" ? "bg-background-muted" : "bg-transparent",
						classes?.group,
						group.variant === "muted" && classes?.groupMuted,
					)}
				>
					<h3
						data-slot="group-title"
						class={cn(
							"text-xs font-medium tracking-wider text-foreground-muted/50 uppercase",
							classes?.groupTitle,
						)}
					>
						{group.title}
					</h3>
					<div class="mt-2 flex flex-col gap-4">
						{#each group.links as link, i (link.href + link.label)}
							<a
								href={link.href}
								onclick={link.onclick}
								data-slot="link"
								class={cn(
									"menu-link group/link relative block w-fit text-2xl font-normal text-foreground-muted transition-colors duration-300 hover:text-foreground",
									classes?.link,
								)}
								style="--delay: {i * 40}ms"
							>
								<span class="relative z-10 block leading-tight">
									<span
										data-slot="link-text"
										class={cn("block whitespace-nowrap", classes?.linkText)}
									>
										{link.label}
									</span>
								</span>
								<span
									data-slot="link-underline"
									class={cn(
										"absolute -bottom-1 left-0 h-px w-full origin-right scale-x-0 bg-foreground transition-transform duration-300 group-hover/link:origin-left group-hover/link:scale-x-100",
										classes?.linkUnderline,
									)}
								></span>
							</a>
							{#if i < group.links.length - 1}
								<hr data-slot="divider" class={cn("border-border", classes?.divider)} />
							{/if}
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.menu-toggle-icon {
		position: absolute;
		opacity: 0;
		filter: blur(4px);
		scale: 0.25;
		transition:
			opacity 150ms ease-out,
			filter 150ms ease-out,
			scale 150ms ease-out;
		will-change: opacity, filter, scale;
	}

	.menu-toggle-open {
		opacity: 1;
		filter: blur(0);
		scale: 1;
	}

	[data-open="true"] .menu-toggle-open {
		opacity: 0;
		filter: blur(4px);
		scale: 0.25;
	}

	[data-open="true"] .menu-toggle-close {
		opacity: 1;
		filter: blur(0);
		scale: 1;
	}

	/* Menu wrapper */
	.menu-wrapper {
		max-height: 0;
		opacity: 0;
		transition:
			max-height 400ms cubic-bezier(0.4, 0, 0.2, 1),
			opacity 200ms ease-out;
	}

	.floating-menu-open .menu-wrapper {
		max-height: 70vh;
		opacity: 1;
	}

	/* Menu links stagger */
	.menu-link {
		opacity: 0;
		transform: translateY(16px);
		transition:
			opacity 200ms ease-out,
			transform 300ms cubic-bezier(0.4, 0, 0.2, 1),
			color 300ms ease-out;
		transition-delay: var(--delay, 0ms);
	}

	.floating-menu-open .menu-link {
		opacity: 1;
		transform: translateY(0);
	}

	/* Mobile adjustments */
	@media (max-width: 767px) {
		.floating-menu {
			transition:
				max-width 400ms cubic-bezier(0.4, 0, 0.2, 1),
				top 400ms cubic-bezier(0.4, 0, 0.2, 1),
				padding-top 400ms cubic-bezier(0.4, 0, 0.2, 1),
				border-radius 400ms cubic-bezier(0.4, 0, 0.2, 1);
		}

		.floating-menu-open {
			top: 0 !important;
			max-width: 100% !important;
			padding-top: 0.5rem;
			border-top-left-radius: 0;
			border-top-right-radius: 0;
		}
	}
</style>
