import { tick } from 'svelte';

/**
 * Использование: <div use:portal={'css selector'} или use:portal={document.body}>
 *
 * @param node
 * @param target
 */
export function portal(node: HTMLElement, target: string | HTMLElement = 'body') {
	let targetEl: HTMLElement | null;

	async function update(newTarget: string | HTMLElement) {
		if (typeof newTarget === 'string') {
			targetEl = document.querySelector(newTarget);
			if (targetEl === null) {
				await tick();
				targetEl = document.querySelector(newTarget);
			}
			if (targetEl === null) {
				// Элемент не найден — добавляем в body и выводим предупреждение
				console.warn(`Portal target "${newTarget}" not found. Appending to body.`);
				targetEl = document.body;
			}
		} else if (newTarget instanceof HTMLElement) {
			targetEl = newTarget;
		} else {
			throw new TypeError(
				`Unknown portal target type: ${typeof newTarget}. Allowed types: string (CSS selector) or HTMLElement.`
			);
		}
		targetEl.appendChild(node);
	}

	function destroy() {
		node.remove();
	}

	void update(target);

	return {
		update,
		destroy
	};
}
