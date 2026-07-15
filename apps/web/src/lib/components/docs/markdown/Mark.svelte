<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';
	let {
		children,
		class: className = '',
		...restProps
	}: { class?: string; children?: Snippet; [prop: string]: unknown } = $props();
</script>

<mark
	{...restProps}
	class={cn(
		'rounded-sm px-1 py-0.5 text-background font-medium bg-accent',
		className
	)}
>{@render children?.()}</mark
>
