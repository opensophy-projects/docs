<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import Overlay from '$lib/components/ui/Overlay.svelte';
	import Close from 'carbon-icons-svelte/lib/Close.svelte';

	let {
		class: className = '',
		alt = '',
		src = '',
		...restProps
	}: { class?: string; alt?: string; src?: string; [prop: string]: unknown } = $props();

	let isOpen = $state(false);
	let scale = $state(1);
	let translateX = $state(0);
	let translateY = $state(0);
	let isDragging = $state(false);
	let dragStart = $state({ x: 0, y: 0 });

	function openImage() {
		isOpen = true;
		scale = 1;
		translateX = 0;
		translateY = 0;
	}

	function closeImage() {
		isOpen = false;
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const delta = e.deltaY > 0 ? -0.1 : 0.1;
		scale = Math.max(0.5, Math.min(5, scale + delta));
	}

	function handleMouseDown(e: MouseEvent) {
		isDragging = true;
		dragStart = { x: e.clientX - translateX, y: e.clientY - translateY };
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging) return;
		translateX = e.clientX - dragStart.x;
		translateY = e.clientY - dragStart.y;
	}

	function handleMouseUp() {
		isDragging = false;
	}

	function handleDoubleClick() {
		if (scale === 1) {
			scale = 2;
		} else {
			scale = 1;
			translateX = 0;
			translateY = 0;
		}
	}
</script>

<span class="inset-shadow my-8 block overflow-hidden rounded-lg bg-background-inset p-1.5">
	<img
		{...restProps}
		{alt}
		{src}
		class={cn(
			'block w-full cursor-zoom-in rounded-md bg-background object-cover card',
			className
		)}
		onclick={openImage}
		onkeydown={(e) => { if (e.key === 'Enter') openImage(); }}
		role="button"
		tabindex="0"
	/>
</span>

{#if isOpen}
	<Overlay onClose={closeImage} backdropCursor="zoom-out">
		<div class="relative flex min-h-[50vh] min-w-[50vw] items-center justify-center">
			<button
				type="button"
				class="absolute top-4 right-4 z-10 flex size-10 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-sm transition-colors hover:bg-background"
				onclick={closeImage}
				aria-label="Закрыть"
			>
				<Close size={20} />
			</button>

			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="flex items-center justify-center overflow-hidden"
				onwheel={handleWheel}
				onmousedown={handleMouseDown}
				onmousemove={handleMouseMove}
				onmouseup={handleMouseUp}
				onmouseleave={handleMouseUp}
				ondragstart={(e) => { e.preventDefault(); }}
				style="cursor: {isDragging ? 'grabbing' : 'grab'};"
			>
				<img
					{src}
					{alt}
					class="max-h-[90vh] max-w-[90vw] min-h-[200px] min-w-[300px] rounded-lg object-contain transition-transform duration-150"
					style="transform: scale({scale}) translate({translateX / scale}px, {translateY / scale}px);"
					ondblclick={handleDoubleClick}
					draggable="false"
				/>
			</div>

			<div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-background/80 px-3 py-1.5 text-sm backdrop-blur-sm">
				<span>{Math.round(scale * 100)}%</span>
				<button
					type="button"
					class="px-2 py-0.5 rounded hover:bg-background-inset"
					onclick={() => {
						scale = 1;
						translateX = 0;
						translateY = 0;
					}}
				>
					Сбросить
				</button>
			</div>
		</div>
	</Overlay>
{/if}
