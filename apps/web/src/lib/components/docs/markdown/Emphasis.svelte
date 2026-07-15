<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';
	let {
		children,
		class: className = '',
		...restProps
	}: { class?: string; children?: Snippet; [prop: string]: unknown } = $props();
</script>

<em {...restProps} class={cn('text-foreground-muted italic', className)}>{@render children?.()}</em>
