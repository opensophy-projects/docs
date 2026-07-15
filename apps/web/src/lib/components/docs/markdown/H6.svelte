<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';
	let {
		children,
		id,
		class: className = '',
		...restProps
	}: { id?: string; class?: string; children?: Snippet; [prop: string]: unknown } = $props();
</script>

<h6
	{id}
	{...restProps}
	class={cn(
		'mt-6 scroll-m-24 text-sm font-semibold tracking-wide text-foreground-muted uppercase [&_code]:text-xs',
		className
	)}
>
	{@render children?.()}
</h6>
