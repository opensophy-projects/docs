import { describe, it, expect, vi, beforeEach } from 'vitest';

const { copyToClipboard } = await import('$lib/utils/copy');

describe('copyToClipboard', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});

	it('бросает ошибку при пустой строке', async () => {
		await expect(copyToClipboard('')).rejects.toThrow('No content to copy');
	});

	it('вызывает navigator.clipboard.writeText', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal('navigator', { clipboard: { writeText } });

		await copyToClipboard('hello');

		expect(writeText).toHaveBeenCalledWith('hello');
	});

	it('бросает CopyError при отсутствии clipboard API', async () => {
		vi.stubGlobal('navigator', {});

		await expect(copyToClipboard('text')).rejects.toThrow('Clipboard unavailable');
	});

	it('бросает CopyError при ошибке writeText', async () => {
		const writeText = vi.fn().mockRejectedValue(new Error('fail'));
		vi.stubGlobal('navigator', { clipboard: { writeText } });

		await expect(copyToClipboard('text')).rejects.toThrow('Clipboard unavailable');
	});
});
