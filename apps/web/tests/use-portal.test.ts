import { describe, it, expect, vi } from 'vitest';
import { portal } from '$lib/utils/use-portal';

describe('portal', () => {
	it('перемещает узел в HTMLElement', () => {
		const target = document.createElement('div');
		document.body.appendChild(target);

		const node = document.createElement('span');
		portal(node, target);

		expect(target.contains(node)).toBe(true);

		target.remove();
	});

	it('по умолчанию добавляет в body', () => {
		const node = document.createElement('span');
		portal(node);

		expect(document.body.contains(node)).toBe(true);

		node.remove();
	});

	it('destroy удаляет узел из DOM', () => {
		const target = document.createElement('div');
		document.body.appendChild(target);

		const node = document.createElement('span');
		const action = portal(node, target);

		expect(target.contains(node)).toBe(true);

		action.destroy();
		expect(node.parentNode).toBeNull();

		target.remove();
	});

	it('бросает TypeError для неподдерживаемого типа target', async () => {
		const target = document.createElement('div');
		document.body.appendChild(target);

		const node = document.createElement('span');
		const action = portal(node, target);

		await expect(action.update(123 as never)).rejects.toThrow(TypeError);

		target.remove();
		node.remove();
	});

	it('выводит предупреждение и добавляет в body при ненайденном селекторе', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const node = document.createElement('span');
		const action = portal(node, 'body');

		await action.update('#nonexistent-selector');

		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('Portal target "#nonexistent-selector" not found')
		);
		expect(document.body.contains(node)).toBe(true);

		node.remove();
		warn.mockRestore();
	});

	it('update перемещает узел в новый target', async () => {
		const target1 = document.createElement('div');
		const target2 = document.createElement('div');
		document.body.appendChild(target1);
		document.body.appendChild(target2);

		const node = document.createElement('span');
		const action = portal(node, target1);

		expect(target1.contains(node)).toBe(true);

		await action.update(target2);
		expect(target2.contains(node)).toBe(true);
		expect(target1.contains(node)).toBe(false);

		target1.remove();
		target2.remove();
	});
});
