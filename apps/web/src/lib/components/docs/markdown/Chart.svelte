<script lang="ts">
	type Datum = { label: string; value: number };
	let { data = [], title = 'Chart' }: { data?: Datum[]; title?: string } = $props();
	const max = $derived(Math.max(...data.map((d) => d.value), 1));
</script>

<div class="inset-shadow my-8 rounded-lg bg-background-inset p-1.5">
	<div class="rounded-md bg-background p-5 card">
		<div class="mb-5 flex items-center justify-between">
			<h3 class="text-base font-semibold text-foreground">{title}</h3>
			<span class="text-xs text-foreground-muted">Markdown chart</span>
		</div>
		<div class="space-y-3">
			{#each data as item (item.label)}
				<div class="grid grid-cols-[7rem_1fr_3rem] items-center gap-3 text-sm">
					<div class="truncate text-foreground-muted">{item.label}</div>
					<div class="h-3 overflow-hidden rounded-full bg-background-muted">
						<div
							class="h-full rounded-full bg-accent shadow-[0_0_18px_oklch(from_var(--color-accent)_l_c_h_/_0.35)]"
							style={`width:${String(Math.max(4, (item.value / max) * 100))}%`}
						></div>
					</div>
					<div class="text-right font-mono text-xs text-foreground">{item.value}</div>
				</div>
			{/each}
		</div>
	</div>
</div>
