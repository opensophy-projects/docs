<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';
	let {
		children,
		class: className = '',
		...restProps
	}: { class?: string; children?: Snippet; [prop: string]: unknown } = $props();
</script>

<del
	{...restProps}
	class={cn('text-foreground-muted line-through decoration-foreground-muted/60', className)}
	>{@render children?.()}</del
>
