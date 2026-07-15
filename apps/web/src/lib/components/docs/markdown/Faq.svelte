<script lang="ts">
	import FaqBase from '$lib/components/ui/Faq.svelte';

	type FaqItem = { question: string; answer: string };
	let { items }: { items?: FaqItem[] } = $props();
</script>

<FaqBase {items} />
