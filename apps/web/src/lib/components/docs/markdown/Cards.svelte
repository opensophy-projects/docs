<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';
	let { children, class: className = '' }: { children?: Snippet; class?: string } = $props();
</script>

<div class={cn('my-8 grid gap-4 md:grid-cols-3', className)}>{@render children?.()}</div>
