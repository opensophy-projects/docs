<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import { slide } from 'svelte/transition';
	import Add from 'carbon-icons-svelte/lib/Add.svelte';

	type FaqItem = {
		question: string;
		answer: string;
	};

	type Props = {
		class?: string;
		items?: FaqItem[];
	};

	const defaultItems: FaqItem[] = [
		{
			question: 'Что это за продукт?',
			answer:
				'Это минималистичный фреймворк для разработки быстрых визуальных эффектов. Он даёт чёткий путь от одного эффекта до полноценного визуального слоя в вашем приложении.'
		},
		{
			question: 'Для кого он предназначен?',
			answer:
				'Он создан для разработчиков, которые хотят современные высокопроизводительные визуальные эффекты без необходимости строить рендер-стек с нуля.'
		},
		{
			question: 'Нужны ли специальные знания для начала работы?',
			answer:
				'Нет. Вы можете начать с минимального шейдера и быстро итерировать. По мере роста проекта вы получаете полный контроль над юниформами, текстурами и постобработкой.'
		},
		{
			question: 'Насколько быстро можно что-то выпустить?',
			answer:
				'Обычно первый визуальный эффект можно запустить за несколько минут: установить, определить материал, смонтировать компонент, а затем настроить в плейграунде.'
		},
		{
			question: 'Подходит ли это для продакшена?',
			answer:
				'Да. Продукт спроектирован для предсказуемого поведения, явного управления рантаймом и чёткой диагностики, чтобы команды могли уверенно переходить от прототипа к продакшену.'
		},
		{
			question: 'Это полноценный 3D-движок?',
			answer:
				'Нет. Продукт фокусируется на полноэкранных фрагментных рабочих процессах и пайплайнах постобработки. Для полных сцен и 3D-инструментария используйте специализированный 3D-движок.'
		},
		{
			question: 'С чего лучше начать?',
			answer:
				'Начните с раздела "Быстрый старт" для мгновенной обратной связи, затем следуйте руководству "Начало работы", чтобы перейти к реальному коду приложения и продакшен-паттернам.'
		}
	];

	let { class: className = '', items = defaultItems }: Props = $props();

	let openItems = $state<Record<string, boolean>>({});

	const isOpen = (question: string): boolean => openItems[question] ?? false;

	function toggle(question: string) {
		openItems[question] = !isOpen(question);
	}
</script>

<div class={cn('inset-shadow w-full overflow-hidden rounded-xl bg-background-inset p-2', className)}>
	<div class="grid gap-2">
		{#each items as item, index (item.question)}
			<div class="inset-shadow relative overflow-hidden rounded-lg bg-background-inset p-1.5">
				<article class="rounded-md bg-background card">
					<button
						type="button"
						id={`faq-trigger-${index.toString()}`}
						class="flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-3 text-left text-base text-foreground sm:px-6"
						aria-expanded={isOpen(item.question)}
						aria-controls={`faq-panel-${index.toString()}`}
						onclick={() => { toggle(item.question); }}
					>
						<span class="font-medium tracking-tight">{item.question}</span>
						<span
							aria-hidden="true"
							class="inset-shadow inline-flex shrink-0 rounded-sm bg-background-inset p-1.5 text-foreground-muted"
						>
							<div
								class:rotate-45={isOpen(item.question)}
								class="transition-transform duration-150"
							>
								<Add size={24} />
							</div>
						</span>
					</button>
					{#if isOpen(item.question)}
						<div
							id={`faq-panel-${index.toString()}`}
							role="region"
							aria-labelledby={`faq-trigger-${index.toString()}`}
							class="px-4 pb-4 sm:px-6"
							transition:slide={{ duration: 220 }}
						>
							<p class="text-sm font-normal tracking-normal text-pretty text-foreground-muted sm:text-base">
								{item.answer}
							</p>
						</div>
					{/if}
				</article>
			</div>
		{/each}
	</div>
</div>
