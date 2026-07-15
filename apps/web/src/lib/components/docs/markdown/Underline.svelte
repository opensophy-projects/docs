<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';
	let {
		children,
		class: className = '',
		...restProps
	}: { class?: string; children?: Snippet; [prop: string]: unknown } = $props();
</script>

<u
	{...restProps}
	class={cn('underline decoration-accent decoration-2 underline-offset-4', className)}
	>{@render children?.()}</u
>
