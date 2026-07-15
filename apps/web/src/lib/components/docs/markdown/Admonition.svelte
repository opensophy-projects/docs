<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';
	import Information from 'carbon-icons-svelte/lib/Information.svelte';
	import Idea from 'carbon-icons-svelte/lib/Idea.svelte';
	import WarningAlt from 'carbon-icons-svelte/lib/WarningAlt.svelte';
	import Error from 'carbon-icons-svelte/lib/Error.svelte';
	import CheckmarkFilled from 'carbon-icons-svelte/lib/CheckmarkFilled.svelte';

	type Variant = 'note' | 'tip' | 'important' | 'warning' | 'caution';
	const config = {
		note: { label: 'Примечание', icon: Information },
		tip: { label: 'Совет', icon: Idea },
		important: { label: 'Важно', icon: CheckmarkFilled },
		warning: { label: 'Предупреждение', icon: WarningAlt },
		caution: { label: 'Осторожно', icon: Error }
	} satisfies Record<Variant, { label: string; icon: typeof Information }>;
	let {
		children,
		title,
		variant = 'note',
		class: className = ''
	}: { children?: Snippet; title?: string; variant?: Variant; class?: string } = $props();
	const item = $derived(config[variant]);
</script>

<div class={cn('inset-shadow my-6 rounded-lg bg-background-inset p-1.5', className)}>
	<div class="grid overflow-hidden rounded-md bg-background card sm:grid-cols-[3.25rem_1fr]">
		<div class="flex items-center justify-center bg-accent text-background sm:min-h-full">
			{#key item.icon}
				{@const Icon = item.icon}
				<Icon size={22} />
			{/key}
		</div>
		<div class="px-5 py-4">
			<div class="text-sm font-semibold tracking-wide text-foreground uppercase">
				{title ?? item.label}
			</div>
			<div class="mt-2 text-base leading-relaxed text-foreground-muted [&>p:first-child]:mt-0">
				{@render children?.()}
			</div>
		</div>
	</div>
</div>
