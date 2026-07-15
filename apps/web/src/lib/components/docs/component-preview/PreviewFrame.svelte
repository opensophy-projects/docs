<script lang="ts">
	import type {
		ComponentPreviewChildren,
		ComponentPreviewValues
	} from './types';
	import { cn } from '$lib/utils/cn';
	import ScrollArea from '$lib/components/ui/ScrollArea.svelte';
	import Maximize from 'carbon-icons-svelte/lib/Maximize.svelte';
	import Minimize from 'carbon-icons-svelte/lib/Minimize.svelte';
	import Reset from 'carbon-icons-svelte/lib/Reset.svelte';

	type Props = {
		children?: ComponentPreviewChildren;
		values: ComponentPreviewValues;
		previewKey: number;
		isFullScreen: boolean;
		class?: string;
		onReload: () => void;
		onToggleFullScreen: () => void;
		previewRef?: HTMLElement;
		placeholderRef?: HTMLElement;
	};

	let {
		children,
		values,
		previewKey,
		isFullScreen,
		class: className = '',
		onReload,
		onToggleFullScreen,
		previewRef = $bindable(),
		placeholderRef = $bindable()
	}: Props = $props();
</script>

<div
	bind:this={placeholderRef}
	class="relative flex min-h-96 flex-1 flex-col items-center justify-center rounded-md bg-background card"
>
	<div
		bind:this={previewRef}
		data-fullscreen={isFullScreen}
		class={cn(
			'group/preview relative flex flex-col overflow-hidden bg-background',
			isFullScreen ? 'z-50' : 'h-full w-full flex-1 rounded-md'
		)}
	>
		<button
			onclick={onReload}
			class="inset-shadow absolute top-2 right-10 z-30 flex size-7 items-center justify-center rounded-sm bg-background-inset text-foreground transition-transform duration-150 ease-out active:scale-[0.95]"
			aria-label="Перезагрузить превью"
		>
			<Reset size={16} />
		</button>
		<button
			onclick={onToggleFullScreen}
			class="inset-shadow absolute top-2 right-2 z-30 flex size-7 items-center justify-center rounded-sm bg-background-inset text-foreground transition-transform duration-150 ease-out active:scale-[0.95]"
			aria-label={isFullScreen ? 'Выйти из полноэкранного режима' : 'На весь экран'}
		>
			{#if isFullScreen}
				<Minimize size={16} />
			{:else}
				<Maximize size={16} />
			{/if}
		</button>
		<ScrollArea
			mode="both"
			id="component-preview-live"
			class={cn('w-full flex-1', !isFullScreen && className)}
			viewportClass="min-h-full w-full flex flex-col"
		>
			<div class="flex w-full flex-1 flex-col items-center justify-center">
				{#key previewKey}
					{@render children?.(values)}
				{/key}
			</div>
		</ScrollArea>
	</div>
</div>
