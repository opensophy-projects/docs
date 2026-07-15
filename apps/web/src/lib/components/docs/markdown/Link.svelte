<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type ComponentProps = {
		class?: string;
		children?: Snippet;
		href?: string;
		[prop: string]: unknown;
	};

	const { children, href, class: className = '', ...restProps }: ComponentProps = $props();
	const external = $derived(typeof href === 'string' && /^https?:\/\//.test(href));
</script>

<a
	{...restProps}
	{href}
	target={external ? '_blank' : undefined}
	rel={external ? 'noreferrer' : undefined}
	class={cn(
		'text-base font-medium tracking-normal text-accent underline decoration-accent/50 decoration-dotted underline-offset-4 transition-[color,decoration-color] duration-150 ease-out hover:text-foreground hover:decoration-foreground-muted',
		className
	)}
>
	{@render children?.()}
</a>
