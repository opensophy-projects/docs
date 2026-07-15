<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import { portal } from '$lib/utils/use-portal';
	import { siteConfig } from '$lib/config/site';
	import Email from 'carbon-icons-svelte/lib/Email.svelte';
	import LogoGithub from 'carbon-icons-svelte/lib/LogoGithub.svelte';

	type Props = {
		class?: string;
	};

	const props = $props();
	const className = $derived((props as Props).class ?? '');

	let isOpen = $state(false);
	let buttonEl: HTMLButtonElement | null = $state(null);
	let menuEl: HTMLDivElement | null = $state(null);
	let menuStyle = $state('');

	const contacts = [
		{
			label: 'GitHub',
			value: siteConfig.links.github,
			href: siteConfig.links.github,
			icon: LogoGithub
		},
		{
			label: siteConfig.links.email,
			value: `mailto:${siteConfig.links.email}`,
			href: `mailto:${siteConfig.links.email}`,
			icon: Email
		}
	];

	function updatePosition() {
		if (!buttonEl || typeof window === 'undefined') return;
		const rect = buttonEl.getBoundingClientRect();
		const menuWidth = 224;
		const padding = 8;
		const bottom = window.innerHeight - rect.top + padding;

		// Align right edge of menu to right edge of button, clamped to viewport
		const rightFromViewport = window.innerWidth - rect.right;
		const safeRight = Math.max(padding, rightFromViewport);

		// If aligning right would push menu off left edge, align left instead
		const leftIfRight = window.innerWidth - safeRight - menuWidth;
		if (leftIfRight < padding) {
			menuStyle = `left: ${String(padding)}px; bottom: ${String(bottom)}px;`;
		} else {
			menuStyle = `right: ${String(safeRight)}px; bottom: ${String(bottom)}px;`;
		}
	}

	function toggle() {
		if (isOpen) {
			close();
			return;
		}
		updatePosition();
		isOpen = true;
	}

	function close() {
		isOpen = false;
	}

	function handleWindowClick(event: MouseEvent) {
		if (event.target instanceof Node) {
			if (buttonEl?.contains(event.target)) return;
			if (menuEl?.contains(event.target)) return;
		}
		close();
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') close();
	}
</script>

<svelte:window
	onclick={handleWindowClick}
	onkeydown={handleWindowKeydown}
	onresize={updatePosition}
/>

<button
	bind:this={buttonEl}
	type="button"
	class={cn(
		'group transition-scale inset-shadow relative inline-flex size-9 items-center justify-center rounded-sm bg-background-inset text-foreground duration-150 ease-out active:scale-[0.95]',
		className
	)}
	onclick={toggle}
	aria-haspopup="true"
	aria-expanded={isOpen}
	aria-label="Контакты"
>
	<Email size={16} />
</button>

{#if isOpen}
	<div
		bind:this={menuEl}
		use:portal={'body'}
		class="fixed z-[9999] min-w-max w-56 rounded-md border border-border bg-background-inset p-1 shadow-lg"
		style={menuStyle}
		role="menu"
	>
		{#each contacts as contact (contact.value)}
			<a
				href={contact.href}
				target="_blank"
				rel="external"
				role="menuitem"
				onclick={close}
				class="flex items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium tracking-normal whitespace-nowrap text-foreground-muted transition-colors duration-150 ease-out hover:bg-background-muted hover:text-foreground"
			>
				<contact.icon size={16} />
				<span class="truncate">{contact.label}</span>
			</a>
		{/each}
	</div>
{/if}
