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

<h5
	{id}
	{...restProps}
	class={cn(
		'mt-7 scroll-m-24 text-base font-semibold tracking-tight text-foreground [&_code]:text-sm',
		className
	)}
>
	{@render children?.()}
</h5>
