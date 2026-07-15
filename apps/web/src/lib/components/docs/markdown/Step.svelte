<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';
	import Checkmark from 'carbon-icons-svelte/lib/Checkmark.svelte';
	import Time from 'carbon-icons-svelte/lib/Time.svelte';
	import Warning from 'carbon-icons-svelte/lib/Warning.svelte';

	type Status = 'todo' | 'active' | 'done' | 'warning';
	let {
		class: className,
		children,
		title,
		status = 'todo'
	}: {
		class?: string;
		children?: Snippet;
		title?: string;
		status?: Status;
	} = $props();
</script>

<div class={cn('relative pl-8', className)} data-step-status={status}>
	<div class="inset-shadow absolute -left-5 flex size-10 rounded-full bg-background-inset p-1.5">
		<span
			class={cn(
				'flex h-full w-full items-center justify-center rounded-full bg-background text-xs font-medium text-foreground card [counter-increment:step]',
				(status === 'active' || status === 'warning') && 'text-accent'
			)}
		>
			{#if status === 'done'}
				<Checkmark size={16} />
			{:else if status === 'active'}
				<Time size={16} />
			{:else if status === 'warning'}
				<Warning size={16} />
			{:else}
				<span class="before:content-[counter(step)]"></span>
			{/if}
		</span>
	</div>
	{#if title}
		<div class="mb-4 flex h-10 items-center">
			<h3 class="relative z-10 text-lg leading-none font-medium tracking-tight">{title}</h3>
		</div>
	{/if}
	<div
		class={cn('text-base leading-relaxed tracking-normal text-foreground-muted', !title && 'pt-2')}
	>
		{@render children?.()}
	</div>
</div>
