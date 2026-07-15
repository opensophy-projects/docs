<script module lang="ts">
	import MarkdownPre from './markdown/MarkdownPre.svelte';
	import MarkdownChart from './markdown/MarkdownChart.svelte';

	Reflect.set(globalThis, '__MarkdownPre', MarkdownPre);
	Reflect.set(globalThis, '__MarkdownChart', MarkdownChart);

	export { default as blockquote } from './markdown/Blockquote.svelte';
	export { default as code } from './markdown/Code.svelte';
	export { default as hr } from './markdown/Divider.svelte';
	export { default as h1 } from './markdown/H1.svelte';
	export { default as h2 } from './markdown/H2.svelte';
	export { default as h3 } from './markdown/H3.svelte';
	export { default as h4 } from './markdown/H4.svelte';
	export { default as h5 } from './markdown/H5.svelte';
	export { default as h6 } from './markdown/H6.svelte';
	export { default as em } from './markdown/Emphasis.svelte';
	export { default as del } from './markdown/Strikethrough.svelte';
	export { default as s } from './markdown/Strikethrough.svelte';
	export { default as u } from './markdown/Underline.svelte';
	export { default as mark } from './markdown/Mark.svelte';
	export { default as img } from './markdown/Image.svelte';
	export { default as a } from './markdown/Link.svelte';
	export { default as li } from './markdown/ListItem.svelte';
	export { default as ol } from './markdown/OrderedList.svelte';
	export { default as p } from './markdown/Paragraph.svelte';
	export { default as pre } from './markdown/Pre.svelte';
	export { default as strong } from './markdown/Strong.svelte';
	export { default as MarkdownPre } from './markdown/MarkdownPre.svelte';
	export { default as table } from './markdown/Table.svelte';
	export { default as tbody } from './markdown/Tbody.svelte';
	export { default as td } from './markdown/Td.svelte';
	export { default as th } from './markdown/Th.svelte';
	export { default as thead } from './markdown/Thead.svelte';
	export { default as tr } from './markdown/Tr.svelte';
	export { default as ul } from './markdown/UnorderedList.svelte';
	export { default as Steps } from './markdown/Steps.svelte';
	export { default as Step } from './markdown/Step.svelte';
	export { default as Admonition } from './markdown/Admonition.svelte';
	export { default as Card } from './markdown/Card.svelte';
	export { default as Cards } from './markdown/Cards.svelte';
	export { default as Columns } from './markdown/Columns.svelte';
	export { default as Chart } from './markdown/Chart.svelte';
	export { default as MarkdownChart } from './markdown/MarkdownChart.svelte';
	export { default as Katex } from './markdown/Katex.svelte';
</script>

<script lang="ts">
	import { type Snippet } from 'svelte';
	let { children }: { children: Snippet } = $props();
</script>

<article
	data-doc-content
	class="w-full max-w-4xl space-y-6 text-base leading-relaxed text-foreground"
>
	{#if children}
		{@render children()}
	{/if}
</article>
