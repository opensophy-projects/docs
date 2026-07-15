<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type ComponentProps = {
		class?: string;
		children?: Snippet;
		[prop: string]: unknown;
	};

	const { children, class: className = '', ...restProps }: ComponentProps = $props();
</script>

<blockquote
	{...restProps}
	class={cn(
		'my-6 border-l-4 border-accent pl-4 text-foreground-muted italic',
		className
	)}
>
	{@render children?.()}
</blockquote>
