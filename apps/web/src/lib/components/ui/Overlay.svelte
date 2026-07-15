<script lang="ts">
	import type { Snippet } from 'svelte';
	import { portal } from '$lib/utils/use-portal';
	import { onMount } from 'svelte';

	type Props = {
		onClose: () => void;
		children: Snippet;
		zIndex?: number;
		backdropCursor?: string;
	}

	let { onClose, children, zIndex = 9999, backdropCursor = 'zoom-out' }: Props = $props();

	onMount(() => {
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		document.addEventListener('keydown', onKey);

		return () => {
			document.body.style.overflow = prev;
			document.removeEventListener('keydown', onKey);
		};
	});
</script>

<div
	use:portal={'body'}
	class="overlay-container"
	style="z-index: {zIndex};"
>
	<!-- Backdrop -->
	<button
		type="button"
		aria-label="Закрыть"
		onclick={onClose}
		class="overlay-backdrop"
		style="cursor: {backdropCursor};"
	></button>

	<!-- Content -->
	<div class="overlay-content">
		{@render children()}
	</div>
</div>

<style>
	.overlay-container {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.overlay-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: none;
		padding: 0;
		display: block;
		width: 100%;
	}

	.overlay-content {
		position: relative;
		z-index: 1;
	}
</style>
