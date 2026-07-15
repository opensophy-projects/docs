<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';
	let {
		children,
		eyebrow,
		title,
		href,
		class: className = ''
	}: {
		children?: Snippet;
		eyebrow?: string;
		title?: string;
		href?: string;
		class?: string;
	} = $props();
</script>

<div class={cn('inset-shadow rounded-xl bg-background-inset p-1.5', className)}>
	<svelte:element
		this={href ? 'a' : 'div'}
		{href}
		class={cn(
			'group block rounded-lg border border-border bg-background p-5 card transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-accent/60'
		)}
	>
		{#if eyebrow}<div class="mb-3 text-xs font-semibold tracking-widest text-accent uppercase">
				{eyebrow}
			</div>{/if}
		{#if title}<div class="text-lg font-semibold tracking-tight text-foreground">{title}</div>{/if}
		<div class="mt-2 text-sm leading-relaxed text-foreground-muted">{@render children?.()}</div>
	</svelte:element>
</div>
