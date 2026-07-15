<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';
	import { portal } from '$lib/utils/use-portal';
	import OverflowMenuVertical from 'carbon-icons-svelte/lib/OverflowMenuVertical.svelte';
	import Copy from 'carbon-icons-svelte/lib/Copy.svelte';
	import Checkmark from 'carbon-icons-svelte/lib/Checkmark.svelte';
	import { onMount } from 'svelte';
	import { copyToClipboard } from '$lib/utils/copy';

	let {
		children,
		class: className = '',
		...restProps
	}: { class?: string; children?: Snippet; [prop: string]: unknown } = $props();

	let tableElement = $state<HTMLTableElement | null>(null);
	let menuOpen = $state(false);
	let menuTriggerEl = $state<HTMLElement | null>(null);
	let menuDropdownEl = $state<HTMLElement | null>(null);
	let menuTop = $state(0);
	let menuLeft = $state(0);
	let sortState = $state<{ index: number; dir: 'asc' | 'desc' | 'none' } | null>(null);
	let originalRowsOrder = $state<HTMLTableRowElement[]>([]);
	let allRows = $state<HTMLTableRowElement[]>([]);
	let copiedFormat = $state<'md' | 'tsv' | null>(null);

	async function copyWithFeedback(format: 'md' | 'tsv') {
		const content = format === 'md' ? md() : tsv();
		if (!content) return;
		try {
			await copyToClipboard(content);
			copiedFormat = format;
		} catch {
			console.error('Failed to copy table');
		}
	}

	$effect(() => {
		if (!copiedFormat) return;
		const t = setTimeout(() => { copiedFormat = null; }, 2000);
		return () => { clearTimeout(t); };
	});

	// Close the menu after copy so the checkmark animation is visible first
	$effect(() => {
		if (!copiedFormat || !menuOpen) return;
		const t = setTimeout(() => { menuOpen = false; }, 1000);
		return () => { clearTimeout(t); };
	});	function tableText() {
		if (!tableElement) return { headers: [] as string[], rows: [] as string[][] };
		return {
			headers: Array.from(tableElement.querySelectorAll('thead th')).map((th) => {
				const clone = th.cloneNode(true) as HTMLElement;
				clone.querySelector('.sort-indicator')?.remove();
				return clone.textContent.trim();
			}),
			rows: Array.from(tableElement.querySelectorAll('tbody tr')).map((tr) =>
				Array.from(tr.querySelectorAll('td')).map((td) => td.textContent.trim())
			)
		};
	}

	function md() {
		const { headers, rows } = tableText();
		if (!headers.length) return '';
		const e = (s: string) => s.replaceAll('|', '\\|');
		return [
			`| ${headers.map(e).join(' | ')} |`,
			`| ${headers.map(() => '---').join(' | ')} |`,
			...rows.map((r) => `| ${r.map(e).join(' | ')} |`)
		].join('\n');
	}

	function tsv() {
		const { headers, rows } = tableText();
		return [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
	}

	function sortBy(index: number) {
		if (!tableElement) return;
		const tbody = tableElement.querySelector('tbody');
		if (!tbody) return;

		const currentDir = sortState?.index === index ? sortState.dir : 'none';
		const nextDir: 'asc' | 'desc' | 'none' =
			currentDir === 'none' ? 'asc' : currentDir === 'asc' ? 'desc' : 'none';

		if (nextDir === 'none') {
			sortState = null;
			originalRowsOrder.forEach((row) => { tbody.append(row); });
			allRows = [...originalRowsOrder];
		} else {
			sortState = { index, dir: nextDir };
			const sortedRows = [...allRows].sort((a, b) => {
				const aText = a.children[index].textContent.trim();
				const bText = b.children[index].textContent.trim();
				return aText.localeCompare(bText) * (nextDir === 'asc' ? 1 : -1);
			});
			sortedRows.forEach((row) => { tbody.append(row); });
			allRows = sortedRows;
		}
	}

	function updateMenuPosition() {
		if (!menuTriggerEl) return;
		const rect = menuTriggerEl.getBoundingClientRect();
		menuTop = rect.bottom + 4;
		menuLeft = rect.right - 192;
	}

	function toggleMenu() {
		if (menuOpen) {
			menuOpen = false;
		} else {
			updateMenuPosition();
			menuOpen = true;
		}
	}

	function closeMenuOnOutside(e: MouseEvent) {
		const target = e.target as Node;
		if (menuTriggerEl?.contains(target) || menuDropdownEl?.contains(target)) return;
		menuOpen = false;
	}

	function onScrollOrResize() {
		if (menuOpen) updateMenuPosition();
	}

	$effect(() => {
		if (!menuOpen) return;
		requestAnimationFrame(() => {
			document.addEventListener('click', closeMenuOnOutside);
			window.addEventListener('scroll', onScrollOrResize, true);
			window.addEventListener('resize', onScrollOrResize);
		});
		return () => {
			document.removeEventListener('click', closeMenuOnOutside);
			window.removeEventListener('scroll', onScrollOrResize, true);
			window.removeEventListener('resize', onScrollOrResize);
		};
	});

	const ARROWS_VERTICAL_PATH =
		'M24 22.6l-5-5-1.4 1.42 6.7 6.7 6.7-6.7-1.4-1.42-5 5V2h-2v20.6zM8 9.4l5 5 1.4-1.42-6.7-6.7-6.7 6.7 1.4 1.42 5-5V30h2V9.4z';
	const ARROWS_VERTICAL_SVG = () =>
		`<svg width="12" height="12" viewBox="0 0 32 32" fill="currentColor"><path d="${ARROWS_VERTICAL_PATH}"/></svg>`;

	$effect(() => {
		if (!tableElement) return;
		tableElement.querySelectorAll('thead th').forEach((th, index) => {
			th.querySelector('.sort-indicator')?.remove();
			const indicator = document.createElement('span');
			indicator.className = 'sort-indicator ml-1 inline-flex items-center';
			if (sortState?.index === index) {
				if (sortState.dir === 'asc') {
					indicator.innerHTML = `<span class="flex items-center text-accent">${ARROWS_VERTICAL_SVG()}<span class="text-[10px] font-bold ml-0.5">A</span><span class="text-[10px] opacity-40 ml-0.5">Z</span></span>`;
				} else {
					indicator.innerHTML = `<span class="flex items-center text-accent">${ARROWS_VERTICAL_SVG()}<span class="text-[10px] opacity-40 ml-0.5">A</span><span class="text-[10px] font-bold ml-0.5">Z</span></span>`;
				}
			} else {
				indicator.classList.add('opacity-30');
				indicator.innerHTML = `${ARROWS_VERTICAL_SVG()}<span class="text-[10px] ml-0.5">AZ</span>`;
			}
			th.appendChild(indicator);
		});
	});

	onMount(() => {
		if (!tableElement) return;
		allRows = Array.from(tableElement.querySelectorAll('tbody tr'));
		originalRowsOrder = [...allRows];
		tableElement.querySelectorAll('thead th').forEach((th, index) => {
			(th as HTMLElement).onclick = () => { sortBy(index); };
		});
	});
</script>

<div class="inset-shadow my-8 rounded-lg bg-background-inset p-1.5">
	<div class="relative rounded-md bg-background card">
		<!-- Three-dots button overlaid at top-right, matching CopyCodeButton style -->
		<div class="pointer-events-none absolute top-2 right-2 z-10 flex items-center gap-2">
			<button
				bind:this={menuTriggerEl}
				type="button"
				class="pointer-events-auto inset-shadow flex size-7 items-center justify-center rounded-sm bg-background-inset text-foreground transition-transform duration-150 ease-out active:scale-[0.95]"
				onclick={toggleMenu}
				aria-label="Меню таблицы"
			>
				<OverflowMenuVertical size={16} />
			</button>
		</div>

		{#if menuOpen}
			<div
				bind:this={menuDropdownEl}
				use:portal={'body'}
				class="fixed z-[100] min-w-48 rounded-md bg-background p-1 text-sm shadow-2xl card"
				style={`top: ${menuTop.toString()}px; left: ${menuLeft.toString()}px;`}
			>
				<button
					class="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-foreground-muted transition-colors hover:bg-background-muted hover:text-foreground"
					onclick={() => { void copyWithFeedback('md'); }}
				>
					<span class="relative flex size-3.5 shrink-0 items-center justify-center">
						<span class="absolute transition-[opacity,transform] duration-150 {copiedFormat === 'md' ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}">
							<Copy size={14} />
						</span>
						<span class="absolute text-success transition-[opacity,transform] duration-150 {copiedFormat === 'md' ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}">
							<Checkmark size={14} />
						</span>
					</span>
					<span class={copiedFormat === 'md' ? 'text-success' : ''}>
						{copiedFormat === 'md' ? 'Скопировано!' : 'Копировать как Markdown'}
					</span>
				</button>
				<button
					class="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-foreground-muted transition-colors hover:bg-background-muted hover:text-foreground"
					onclick={() => { void copyWithFeedback('tsv'); }}
				>
					<span class="relative flex size-3.5 shrink-0 items-center justify-center">
						<span class="absolute transition-[opacity,transform] duration-150 {copiedFormat === 'tsv' ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}">
							<Copy size={14} />
						</span>
						<span class="absolute text-success transition-[opacity,transform] duration-150 {copiedFormat === 'tsv' ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}">
							<Checkmark size={14} />
						</span>
					</span>
					<span class={copiedFormat === 'tsv' ? 'text-success' : ''}>
						{copiedFormat === 'tsv' ? 'Скопировано!' : 'Копировать как Excel/TSV'}
					</span>
				</button>
			</div>
		{/if}

		<div class="w-full overflow-auto rounded-md">
			<table
				bind:this={tableElement}
				{...restProps}
				class={cn('w-full min-w-max text-lg [&_code]:text-base', className)}
			>
				{@render children?.()}
			</table>
		</div>
	</div>
</div>

<style>
	:global(thead th) {
		cursor: pointer;
		user-select: none;
	}
</style>
