<script lang="ts">
	import { browser } from '$app/environment';
	import { brandingConfig } from '$lib/config/branding';
	import { themeStore } from '$lib/stores/theme.svelte';

	const { class: className, size = 6 }: { class?: string; size?: number } = $props();

	// Resolve logo with fallback: theme-specific > universal logo
	const logoLight = brandingConfig.logoLight || brandingConfig.logoDark || brandingConfig.logo;
	const logoDark = brandingConfig.logoDark || brandingConfig.logoLight || brandingConfig.logo;

	// For SSR, check DOM directly to avoid hydration mismatch
	// The theme is set in app.html before Svelte hydrates
	const getInitialIsDark = (): boolean => {
		if (!browser) return false;
		return document.documentElement.classList.contains('dark');
	};

	let isDark = $state(getInitialIsDark());

	// Sync with theme store once it's ready
	$effect(() => {
		if (browser) {
			isDark = themeStore.isDark;
		}
	});

	const logoSrc = $derived(isDark ? logoDark : logoLight);
</script>

<img
	src={logoSrc}
	alt={brandingConfig.name}
	class={className}
	style="width: {size * 0.25}rem; height: {size * 0.25}rem;"
/>
