<script lang="ts">
	import Katex from 'svelte-katex';

	let {
		value = '',
		block = false,
		displayMode = block,
		children
	}: { value?: string; block?: boolean; displayMode?: boolean; children?: import('svelte').Snippet } = $props();

	// Use slot content if provided, otherwise use value prop
	const _content = $derived(children ? '' : value);
</script>

{#if block || displayMode}
	<div class="my-6 overflow-x-auto rounded-md bg-background-inset p-4">
		{#if children}
			<Katex displayMode>{@render children()}</Katex>
		{:else}
			<Katex displayMode>{value}</Katex>
		{/if}
	</div>
{:else}
	{#if children}
		<Katex>{@render children()}</Katex>
	{:else}
		<Katex>{value}</Katex>
	{/if}
{/if}
