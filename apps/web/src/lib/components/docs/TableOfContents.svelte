<script lang="ts">
	import { fromAction } from 'svelte/attachments';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { cn } from '$lib/utils/cn';
	import { page } from '$app/state';
	import TableOfContents from 'carbon-icons-svelte/lib/TableOfContents.svelte';
	import type { ContentTocHeading } from '$lib/content/sections';

	type TocItem = ContentTocHeading & {
		element: HTMLElement;
	};

	type IndicatorRange = {
		startId: string;
		endId: string;
	};

	type PathPoint = {
		x: number;
		y: number;
	};

	type Props = {
		selector?: string;
		title?: string;
		emptyLabel?: string;
		minViewportWidth?: number;
		scrollContainerId?: string;
		headings?: ContentTocHeading[];
		maxHeight?: string;
	};

	const props = $props();
	const selector = $derived(
		(props as Props).selector ?? '[data-doc-content] h2, [data-doc-content] h3'
	);
	const title = $derived((props as Props).title ?? 'On this page');
	const emptyLabel = $derived((props as Props).emptyLabel ?? 'No headings');
	const minViewportWidth = $derived((props as Props).minViewportWidth ?? 1280);
	const scrollContainerId = $derived((props as Props).scrollContainerId ?? null);
	const initialHeadings = $derived(normalizeHeadings((props as Props).headings));
	const maxHeight = $derived((props as Props).maxHeight ?? '70vh');

	let headings = $state<ContentTocHeading[]>([]);
	const renderedHeadings = $derived(headings.length > 0 ? headings : initialHeadings);
	let activeId = $state('');
	let indicatorTop = $state(0);
	let indicatorHeight = $state(0);
	let indicatorBottom = $state(0);
	let lineHeight = $state(0);
	let svgPath = $state('');
	let svgWidth = $state(40);
	let indicatorRange = $state<IndicatorRange | null>(null);
	let pendingIndicatorFrame: number | null = null;
	let lastPulsedRangeKey = '';
	let viewportWidth = $state(0);
	const tocViewportActive = $derived(viewportWidth >= minViewportWidth);
	let collectFrame: number | null = null;
	let collectCleanup: (() => void) | undefined;

	// Fade overlay state — whether the list overflows its scroll box,
	// so we know when to show the top/bottom blur-into-background masks.
	let tocScrollEl = $state<HTMLDivElement | null>(null);
	let canScrollUp = $state(false);
	let canScrollDown = $state(false);
	let fadeResizeObserver: ResizeObserver | null = null;

	const ACTIVE_OFFSET = 140;
	const VISIBLE_BUFFER = 24;
	const CORNER_RADIUS = 2;
	const linkRefs = new SvelteMap<string, HTMLAnchorElement>();
	const linkPositions = new SvelteMap<string, { top: number; height: number }>();
	const headingOrder = new SvelteMap<string, number>();
	const pulseTimers = new SvelteMap<string, number>();
	const lastIndicatorIds = new SvelteSet<string>();
	let pulsingDotIds = $state<string[]>([]);
	const linksWrapperId = 'toc-links-wrapper';

	const currentPath = $derived(page.url.pathname);

	function getScrollContainer() {
		if (typeof document === 'undefined') return window;
		if (!scrollContainerId) return window;
		const element = document.getElementById(scrollContainerId);
		return element ?? window;
	}

	const slugify = (value: string) =>
		value
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');

	function normalizeHeadings(value?: ContentTocHeading[]) {
		return Array.isArray(value)
			? value.filter(
					(heading): heading is ContentTocHeading =>
						typeof heading.id === 'string' &&
						heading.id.length > 0 &&
						typeof heading.text === 'string' &&
						heading.text.length > 0 &&
						typeof heading.level === 'number'
				)
			: [];
	}

	function syncHeadingOrder(nextHeadings: ContentTocHeading[]) {
		headingOrder.clear();
		nextHeadings.forEach(({ id }, index) => {
			headingOrder.set(id, index);
		});
	}

	function applyHeadings(nextHeadings: ContentTocHeading[]) {
		headings = nextHeadings;
		syncHeadingOrder(nextHeadings);
		activeId = nextHeadings[0]?.id ?? '';
		lineHeight = 0;
		indicatorTop = 0;
		indicatorHeight = 0;
		indicatorBottom = 0;
		indicatorRange = null;
		lastPulsedRangeKey = '';
		lastIndicatorIds.clear();
	}

	function resetTocState(options: { clearHeadings?: boolean } = {}) {
		if (options.clearHeadings ?? true) {
			headings = [];
			headingOrder.clear();
		}
		activeId = '';
		lineHeight = 0;
		indicatorTop = 0;
		indicatorHeight = 0;
		indicatorBottom = 0;
		indicatorRange = null;
		lastPulsedRangeKey = '';
		lastIndicatorIds.clear();
		pulsingDotIds = [];
		if (typeof window !== 'undefined') {
			pulseTimers.forEach((timer) => {
				window.clearTimeout(timer);
			});
		}
		pulseTimers.clear();
		if (typeof window !== 'undefined' && pendingIndicatorFrame !== null) {
			window.cancelAnimationFrame(pendingIndicatorFrame);
			pendingIndicatorFrame = null;
		}
	}

	function syncInitialHeadings() {
		applyHeadings(initialHeadings);
	}

	function pulseDot(id: string) {
		if (typeof window === 'undefined' || !id) return;

		const existingTimer = pulseTimers.get(id);
		if (existingTimer) {
			window.clearTimeout(existingTimer);
		}

		pulsingDotIds = pulsingDotIds.filter((item) => item !== id);
		window.requestAnimationFrame(() => {
			pulsingDotIds = [...pulsingDotIds, id];
			const timer = window.setTimeout(() => {
				pulsingDotIds = pulsingDotIds.filter((item) => item !== id);
				pulseTimers.delete(id);
			}, 560);
			pulseTimers.set(id, timer);
		});
	}

	function pulseRange(range: IndicatorRange | null) {
		if (!range) return;
		const rangeKey = `${range.startId}:${range.endId}`;
		if (rangeKey === lastPulsedRangeKey) return;
		lastPulsedRangeKey = rangeKey;

		const startIndex = headingOrder.get(range.startId);
		const endIndex = headingOrder.get(range.endId);
		if (startIndex === undefined || endIndex === undefined) return;

		const min = Math.min(startIndex, endIndex);
		const max = Math.max(startIndex, endIndex);

		const nextIndicatorIds = headings
			.filter((_heading, index) => index >= min && index <= max)
			.map((heading) => heading.id);

		nextIndicatorIds.forEach((id) => {
			if (!lastIndicatorIds.has(id)) {
				pulseDot(id);
			}
		});

		lastIndicatorIds.clear();
		nextIndicatorIds.forEach((id) => {
			lastIndicatorIds.add(id);
		});
	}

	function clearCollectionWork() {
		if (typeof window !== 'undefined' && collectFrame !== null) {
			window.cancelAnimationFrame(collectFrame);
		}
		collectFrame = null;

		collectCleanup?.();
		collectCleanup = undefined;
	}

	function registerLink(node: HTMLElement, id?: string) {
		let currentId = id ?? '';

		const assign = () => {
			if (!currentId) return;
			linkRefs.set(currentId, node as HTMLAnchorElement);
		};

		assign();

		return {
			update(newId?: string) {
				if (newId === currentId) return;
				if (currentId) {
					linkRefs.delete(currentId);
					linkPositions.delete(currentId);
				}
				currentId = newId ?? '';
				assign();
			},
			destroy() {
				if (currentId) {
					linkRefs.delete(currentId);
					linkPositions.delete(currentId);
				}
			}
		};
	}

	function buildRoundedPath(points: PathPoint[], radius: number) {
		if (points.length === 0) return '';
		if (points.length === 1) {
			const [point] = points;
			return `M ${point.x.toString()} ${point.y.toString()}`;
		}

		const commands: string[] = [`M ${points[0].x.toString()} ${points[0].y.toString()}`];

		for (let i = 1; i < points.length; i++) {
			const point = points[i];
			const prev = points[i - 1];

			if (i === points.length - 1) {
				commands.push(` L ${point.x.toString()} ${point.y.toString()}`);
				continue;
			}

			const next = points[i + 1];
			const prevVecX = point.x - prev.x;
			const prevVecY = point.y - prev.y;
			const nextVecX = next.x - point.x;
			const nextVecY = next.y - point.y;
			const prevLen = Math.hypot(prevVecX, prevVecY);
			const nextLen = Math.hypot(nextVecX, nextVecY);

			if (prevLen === 0 || nextLen === 0) {
				commands.push(` L ${point.x.toString()} ${point.y.toString()}`);
				continue;
			}

			const prevDirX = prevVecX / prevLen;
			const prevDirY = prevVecY / prevLen;
			const nextDirX = nextVecX / nextLen;
			const nextDirY = nextVecY / nextLen;
			const dot = prevDirX * nextDirX + prevDirY * nextDirY;

			if (Math.abs(dot) > 0.999) {
				commands.push(` L ${point.x.toString()} ${point.y.toString()}`);
				continue;
			}

			const cornerRadius = Math.min(radius, prevLen / 2, nextLen / 2);
			const entryX = point.x - prevDirX * cornerRadius;
			const entryY = point.y - prevDirY * cornerRadius;
			const exitX = point.x + nextDirX * cornerRadius;
			const exitY = point.y + nextDirY * cornerRadius;

			commands.push(` L ${entryX.toString()} ${entryY.toString()}`);
			commands.push(
				` Q ${point.x.toString()} ${point.y.toString()} ${exitX.toString()} ${exitY.toString()}`
			);
		}

		return commands.join('');
	}

	function getLinksWrapperElement() {
		if (typeof document === 'undefined') return null;
		const node = document.getElementById(linksWrapperId);
		return node instanceof HTMLOListElement ? node : null;
	}

	function updateLayout() {
		const linksWrapper = getLinksWrapperElement();
		if (!linksWrapper || headings.length === 0) {
			lineHeight = 0;
			return;
		}

		linkPositions.clear();
		const polyline: PathPoint[] = [];
		let maxW = 0;
		const indentStep = 12;
		const strokeWidth = 1;
		const halfStroke = strokeWidth / 2;

		headings.forEach((heading) => {
			const node = linkRefs.get(heading.id);
			if (!node) return;

			const style = window.getComputedStyle(node);
			const paddingTop = parseFloat(style.paddingTop) || 0;
			const paddingBottom = parseFloat(style.paddingBottom) || 0;
			const positionTop = node.offsetTop + paddingTop;
			const positionBottom = node.offsetTop + node.offsetHeight - paddingBottom;
			const positionHeight = Math.max(0, positionBottom - positionTop);

			linkPositions.set(heading.id, {
				top: positionTop,
				height: positionHeight
			});

			const x = (heading.level - 2) * indentStep + halfStroke;
			const top = positionTop;
			const bottom = Math.max(positionTop, positionBottom);

			polyline.push({ x, y: top });
			polyline.push({ x, y: bottom });

			maxW = Math.max(maxW, x + halfStroke);
		});

		svgPath = buildRoundedPath(polyline, CORNER_RADIUS);
		svgWidth = Math.max(40, maxW + 10);
		lineHeight = linksWrapper.scrollHeight;
	}

	function updateIndicator(range?: IndicatorRange) {
		const appliedRange =
			range ?? indicatorRange ?? (activeId ? { startId: activeId, endId: activeId } : null);

		if (!appliedRange) {
			indicatorRange = null;
			indicatorTop = 0;
			indicatorHeight = 0;
			indicatorBottom = 0;
			return;
		}

		if (range) {
			indicatorRange = range;
		} else {
			indicatorRange ??= appliedRange;
		}

		const startPos = linkPositions.get(appliedRange.startId);
		const endPos = linkPositions.get(appliedRange.endId);

		if (!startPos || !endPos) {
			indicatorTop = 0;
			indicatorHeight = 0;
			indicatorBottom = 0;
			return;
		}

		const top = Math.min(startPos.top, endPos.top);
		const bottom = Math.max(startPos.top + startPos.height, endPos.top + endPos.height);

		indicatorTop = top;
		indicatorHeight = Math.max(0, bottom - top);
		indicatorBottom = bottom;
	}

	function scheduleIndicatorUpdate(range?: IndicatorRange | null) {
		if (typeof window === 'undefined') {
			if (range) {
				pulseRange(range);
				updateIndicator(range);
			} else {
				updateIndicator();
			}
			return;
		}

		if (pendingIndicatorFrame !== null) {
			window.cancelAnimationFrame(pendingIndicatorFrame);
		}

		pendingIndicatorFrame = window.requestAnimationFrame(() => {
			pendingIndicatorFrame = null;
			if (range) {
				pulseRange(range);
				updateIndicator(range);
			} else {
				updateIndicator();
			}
		});
	}

	// Recompute whether the scroll box has hidden content above/below,
	// so the fade overlays only show up when there's actually something to hide.
	function updateFadeState() {
		const el = tocScrollEl;
		if (!el) {
			canScrollUp = false;
			canScrollDown = false;
			return;
		}
		const epsilon = 1;
		canScrollUp = el.scrollTop > epsilon;
		canScrollDown = el.scrollTop + el.clientHeight < el.scrollHeight - epsilon;
	}

	function collectDomHeadings(): TocItem[] {
		const slugCounts = new SvelteMap<string, number>();
		const usedIds = new SvelteSet<string>();
		const nodeList = Array.from(document.querySelectorAll(selector)).filter(
			(node): node is HTMLElement => node instanceof HTMLElement
		);

		const parsed: TocItem[] = [];

		for (const node of nodeList) {
			const rawText = node.textContent;
			const text = rawText ? rawText.trim() : '';
			if (!text) continue;

			let id = node.id;
			if (!id) {
				let baseSlug = slugify(text);
				if (!baseSlug) {
					baseSlug = `section-${(parsed.length + 1).toString()}`;
				}
				const count = slugCounts.get(baseSlug);
				if (typeof count === 'number') {
					const nextCount = count + 1;
					slugCounts.set(baseSlug, nextCount);
					baseSlug = `${baseSlug}-${nextCount.toString()}`;
				} else {
					slugCounts.set(baseSlug, 0);
				}
				id = baseSlug;
			}

			if (usedIds.has(id)) {
				const baseId = id;
				let nextCount = slugCounts.get(baseId) ?? 0;

				do {
					nextCount += 1;
					id = `${baseId}-${nextCount.toString()}`;
				} while (usedIds.has(id));

				slugCounts.set(baseId, nextCount);
			}

			if (node.id !== id) {
				node.id = id;
			}
			usedIds.add(id);

			const level = Number(node.tagName.replace('H', '')) || 2;
			parsed.push({
				id,
				text,
				level,
				element: node
			});
		}

		return parsed;
	}

	function resolveInitialHeadingElements(): TocItem[] {
		if (initialHeadings.length === 0) return [];

		const parsed = initialHeadings.flatMap((heading): TocItem[] => {
			const element = document.getElementById(heading.id);
			return element instanceof HTMLElement ? [{ ...heading, element }] : [];
		});

		return parsed.length === initialHeadings.length ? parsed : [];
	}

	function collectHeadings() {
		if (typeof document === 'undefined' || !tocViewportActive) {
			resetTocState({ clearHeadings: false });
			return undefined;
		}

		const initialParsed = resolveInitialHeadingElements();
		const parsed = initialParsed.length > 0 ? initialParsed : collectDomHeadings();

		applyHeadings(parsed.map(({ element: _element, ...rest }) => rest));

		lineHeight = 0;
		indicatorTop = 0;
		indicatorHeight = 0;
		indicatorBottom = 0;
		indicatorRange = null;

		requestAnimationFrame(() => {
			updateLayout();
			updateFadeState();
		});

		if (!parsed.length) {
			return undefined;
		}

		const updateActive = () => {
			let current = parsed[0]?.id ?? '';
			const scrollEl = getScrollContainer();
			const isWindow = scrollEl === window;
			const scrollY = isWindow ? window.scrollY : (scrollEl as HTMLElement).scrollTop;
			const viewportHeight = isWindow ? window.innerHeight : (scrollEl as HTMLElement).clientHeight;
			const scrollHeight = isWindow
				? document.documentElement.scrollHeight
				: (scrollEl as HTMLElement).scrollHeight;
			const containerBounds = isWindow
				? { top: 0, bottom: viewportHeight }
				: (scrollEl as HTMLElement).getBoundingClientRect();
			const viewportTop = containerBounds.top - VISIBLE_BUFFER;
			const viewportBottom = containerBounds.bottom + VISIBLE_BUFFER;
			const visibleIds: string[] = [];

			for (const item of parsed) {
				const rect = item.element.getBoundingClientRect();
				if (rect.bottom >= viewportTop && rect.top <= viewportBottom) {
					visibleIds.push(item.id);
				}
				if (rect.top - ACTIVE_OFFSET <= viewportTop + VISIBLE_BUFFER) {
					current = item.id;
				}
			}

			const last = parsed[parsed.length - 1];
			const scrolledBottom = scrollY + viewportHeight;
			if (scrolledBottom >= scrollHeight - 20) {
				current = last.id;
			}

			activeId = current;
			const range: IndicatorRange | null =
				visibleIds.length > 0
					? {
							startId: visibleIds[0],
							endId: visibleIds[visibleIds.length - 1]
						}
					: current
						? { startId: current, endId: current }
						: null;

			scheduleIndicatorUpdate(range);

			// Keep the active link within view inside the (unmodified) TOC list,
			// and keep the fade overlays in sync with the new scroll position.
			const activeNode = linkRefs.get(current);
			const scrollBox = tocScrollEl;
			if (activeNode && scrollBox) {
				const nodeTop = activeNode.offsetTop;
				const nodeBottom = nodeTop + activeNode.offsetHeight;
				const viewTop = scrollBox.scrollTop;
				const viewBottom = viewTop + scrollBox.clientHeight;

				if (nodeTop < viewTop) {
					scrollBox.scrollTop = nodeTop;
				} else if (nodeBottom > viewBottom) {
					scrollBox.scrollTop = nodeBottom - scrollBox.clientHeight;
				}
			}
			updateFadeState();
		};

		const container = getScrollContainer();

		if (parsed.length > 0) {
			updateActive();
		}

		const handleResize = () => {
			updateActive();
			updateLayout();
			updateFadeState();
		};

		container.addEventListener('scroll', updateActive, { passive: true });
		window.addEventListener('resize', handleResize);

		return () => {
			container.removeEventListener('scroll', updateActive);
			window.removeEventListener('resize', handleResize);
			pulseTimers.forEach((timer) => {
				window.clearTimeout(timer);
			});
			pulseTimers.clear();
			pulsingDotIds = [];
			lastIndicatorIds.clear();
			if (pendingIndicatorFrame !== null) {
				window.cancelAnimationFrame(pendingIndicatorFrame);
				pendingIndicatorFrame = null;
			}
		};
	}

	function isLinkHighlighted(id: string) {
		if (!indicatorRange) {
			return activeId === id;
		}

		const startIndex = headingOrder.get(indicatorRange.startId);
		const endIndex = headingOrder.get(indicatorRange.endId);
		const currentIndex = headingOrder.get(id);

		if (startIndex === undefined || endIndex === undefined || currentIndex === undefined) {
			return activeId === id;
		}

		const min = Math.min(startIndex, endIndex);
		const max = Math.max(startIndex, endIndex);

		return currentIndex >= min && currentIndex <= max;
	}

	function manageToc(
		_node: HTMLElement,
		deps: { path: string; active: boolean; selector: string }
	) {
		let currentDeps = deps;

		const run = () => {
			clearCollectionWork();
			syncInitialHeadings();

			if (!currentDeps.active) {
				resetTocState({ clearHeadings: false });
				return;
			}

			collectFrame = window.requestAnimationFrame(() => {
				collectFrame = null;
				collectCleanup = collectHeadings();
			});
		};

		run();

		return {
			update(nextDeps: { path: string; active: boolean; selector: string }) {
				currentDeps = nextDeps;
				run();
			},
			destroy() {
				clearCollectionWork();
				resetTocState();
			}
		};
	}

	function observeLinksWrapper(node: HTMLOListElement, active: boolean) {
		let observer: ResizeObserver | null = null;

		const sync = (enabled: boolean) => {
			observer?.disconnect();
			observer = null;

			if (typeof window === 'undefined' || !enabled) return;

			observer = new ResizeObserver(() => {
				updateLayout();
				updateFadeState();
				updateIndicator();
			});

			observer.observe(node);
		};

		sync(active);

		return {
			update(nextActive: boolean) {
				sync(nextActive);
			},
			destroy() {
				observer?.disconnect();
			}
		};
	}

	// Attaches the scroll-box element reference and listens for scroll/resize
	// so the top/bottom fade overlays know when to appear, without altering
	// anything about the TOC's own internal layout/line-drawing logic.
	function observeTocScrollBox(node: HTMLDivElement) {
		tocScrollEl = node;
		updateFadeState();

		const onScroll = () => { updateFadeState(); };
		node.addEventListener('scroll', onScroll, { passive: true });

		fadeResizeObserver?.disconnect();
		fadeResizeObserver = null;
		if (typeof window !== 'undefined') {
			fadeResizeObserver = new ResizeObserver(() => { updateFadeState(); });
			fadeResizeObserver.observe(node);
		}

		return {
			destroy() {
				node.removeEventListener('scroll', onScroll);
				fadeResizeObserver?.disconnect();
				fadeResizeObserver = null;
				if (tocScrollEl === node) {
					tocScrollEl = null;
				}
			}
		};
	}
</script>

<svelte:window bind:innerWidth={viewportWidth} />

<div
	class="contents"
	{@attach fromAction(manageToc, () => ({
		path: currentPath,
		active: tocViewportActive,
		selector
	}))}
>
	{#if renderedHeadings.length > 0}
		<nav aria-label={title}>
			<div
				class="mb-2 flex items-center gap-2 text-xs font-medium tracking-wide text-foreground-muted/70 uppercase"
			>
				<TableOfContents size={16} />
				{title}
			</div>

			<!--
				Outer wrapper is `relative` so the fade overlays below can be
				positioned exactly over the scrollable box, without touching
				the internal structure (lines, dots, indicator) at all.
			-->
			<div class="relative">
				<div
					class="scrollbar-none overflow-y-auto"
					style={`max-height: ${maxHeight}; -webkit-mask-image: none;`}
					{@attach fromAction(observeTocScrollBox, () => undefined)}
				>
					<div class="relative mx-1 flex">
						<div
							class="pointer-events-none absolute top-0 left-[2.5px] h-full w-10"
							style={`
	                    mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${svgWidth.toString()} ${lineHeight.toString()}' width='${svgWidth.toString()}' height='${lineHeight.toString()}' preserveAspectRatio='none'%3E%3Cpath d='${svgPath}' stroke='black' stroke-width='1' fill='none'/%3E%3C/svg%3E");
                    -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${svgWidth.toString()} ${lineHeight.toString()}' width='${svgWidth.toString()}' height='${lineHeight.toString()}' preserveAspectRatio='none'%3E%3Cpath d='${svgPath}' stroke='black' stroke-width='1' fill='none'/%3E%3C/svg%3E");
                    mask-repeat: no-repeat;
                    -webkit-mask-repeat: no-repeat;
                    mask-position: left top;
                    -webkit-mask-position: left top;
                    mask-size: 100% 100%;
                    -webkit-mask-size: 100% 100%;
                `}
						>
							<div class="absolute inset-0 h-full w-full bg-border"></div>

							{#if indicatorHeight > 0}
								<div
									class="toc-active-line absolute left-0 w-full transition-[top,bottom] duration-450 ease-out"
									style={`
	                            top: ${indicatorTop.toString()}px;
	                            bottom: ${Math.max(0, lineHeight - indicatorBottom).toString()}px;
                        `}
								></div>
							{/if}
						</div>

						<ol
							id={linksWrapperId}
							class="relative flex flex-col text-sm"
							{@attach fromAction(observeLinksWrapper, () => tocViewportActive)}
						>
							{#each renderedHeadings as heading (heading.id)}
								<li
									class="transition-colors duration-150 ease-out"
									style={`padding-left: ${((heading.level - 2) * 12).toString()}px`}
								>
									<a
										href={`#${heading.id}`}
										onclick={() => {
											pulseDot(heading.id);
										}}
										class={cn(
											'flex items-center gap-2 py-1 font-medium tracking-normal transition-[color] duration-150 ease-out',
											isLinkHighlighted(heading.id)
												? 'text-accent'
												: 'text-foreground-muted hover:text-foreground'
										)}
										{@attach fromAction(registerLink, () => heading.id)}
									>
										<span
											aria-hidden="true"
											class={cn(
												'toc-dot relative size-1.5 flex-none rounded-full transition-[background-color,box-shadow,scale] duration-150 ease-out',
												isLinkHighlighted(heading.id) && 'toc-dot-active',
												pulsingDotIds.includes(heading.id) && 'toc-dot-pulse'
											)}
										></span>
										<span
											class={cn(
												'min-w-0 pl-1',
												isLinkHighlighted(heading.id) && 'text-accent'
											)}
										>
											{heading.text}
										</span>
									</a>
								</li>
							{/each}
						</ol>
					</div>
				</div>

				<!--
					Fade overlays: purely visual, positioned on top of the scroll box.
					They don't affect layout, line drawing, or indicator math at all —
					they just blur/hide overflow content into the page background color
					(#17181a) when the list is taller than its max-height.
				-->
				{#if canScrollUp}
					<div
						class="toc-fade toc-fade-top pointer-events-none absolute inset-x-0 top-0 h-10"
						aria-hidden="true"
					></div>
				{/if}
				{#if canScrollDown}
					<div
						class="toc-fade toc-fade-bottom pointer-events-none absolute inset-x-0 bottom-0 h-10"
						aria-hidden="true"
					></div>
				{/if}
			</div>
		</nav>
	{:else}
		<div class="hidden text-sm tracking-normal text-foreground-muted/70 lg:block">{emptyLabel}</div>
	{/if}
</div>

<style>
	.toc-active-line {
		background-image: linear-gradient(
			to bottom,
			transparent,
			oklch(from var(--color-accent) l c h / 0.68) 22%,
			var(--color-accent) 50%,
			oklch(from var(--color-accent) l c h / 0.68) 78%,
			transparent
		);
		filter: drop-shadow(0 0 6px oklch(from var(--color-accent) l c h / 0.38));
	}

	.toc-dot {
		background-color: var(--color-foreground-muted);
		box-shadow: 0 0 0 2px var(--color-background);
		opacity: 0.72;
	}

	.toc-dot-active {
		background-color: var(--color-accent);
		box-shadow:
			inset 0 1px oklch(from var(--color-white-fixed) l c h / 0.35),
			0 0 0 2px var(--color-background),
			0 0 10px oklch(from var(--color-accent) l c h / 0.38);
		opacity: 1;
	}

	.toc-dot-active::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 9999px;
		box-shadow: 0 0 9px oklch(from var(--color-accent) l c h / 0.5);
	}

	.toc-dot-pulse {
		animation: toc-dot-pulse 0.52s ease-out both;
	}

	@keyframes toc-dot-pulse {
		0% {
			transform: scale(1);
			box-shadow: 0 0 0 2px var(--color-background);
		}

		12% {
			transform: scale(1.15);
			background-color: var(--color-accent);
			box-shadow:
				0 0 0 2px var(--color-background),
				0 0 0 3px oklch(from var(--color-accent) l c h / 0.18),
				0 0 18px oklch(from var(--color-accent) l c h / 0.52);
		}

		100% {
			transform: scale(1);
		}
	}

	/* Hide the native scrollbar on the TOC scroll box so the fade
	   overlays are the only visible cue that there's more content. */
	.scrollbar-none {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.scrollbar-none::-webkit-scrollbar {
		display: none;
	}

	/* Fade-to-background overlays. Uses the same background variable as
	   whatever surface the TOC sits on (desktop sidebar, mobile panel, etc.)
	   so the fade color always matches exactly instead of a fixed hex —
	   content doesn't get clipped abruptly, it softly blurs into the
	   background and disappears. */
	.toc-fade {
		z-index: 1;
		background: var(--toc-fade-color, var(--color-background-inset, var(--color-background)));
	}

	.toc-fade-top {
		mask-image: linear-gradient(to bottom, black 0%, black 15%, transparent 100%);
		-webkit-mask-image: linear-gradient(to bottom, black 0%, black 15%, transparent 100%);
	}

	.toc-fade-bottom {
		mask-image: linear-gradient(to top, black 0%, black 15%, transparent 100%);
		-webkit-mask-image: linear-gradient(to top, black 0%, black 15%, transparent 100%);
	}
</style>