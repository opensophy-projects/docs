import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['tests/**/*.test.ts'],
		environment: 'happy-dom',
		coverage: {
			provider: 'v8',
			reporter: ['lcov', 'text-summary'],
			reportsDirectory: 'coverage',
			include: ['src/lib/**/*.ts'],
			exclude: [
				'src/lib/content/**',
				'src/lib/**/*.svelte',
				'src/lib/components/**',
				'src/lib/helpers/**'
			]
		}
	}
});
