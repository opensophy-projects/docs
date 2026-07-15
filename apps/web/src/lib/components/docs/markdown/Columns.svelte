<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';
	let {
		children,
		count = 2,
		class: className = ''
	}: { children?: Snippet; count?: 2 | 3 | 4; class?: string } = $props();
	const cols = $derived(
		count === 4 ? 'md:grid-cols-4' : count === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'
	);
</script>

<div class={cn('my-8 grid gap-4', cols, className)}>{@render children?.()}</div>
