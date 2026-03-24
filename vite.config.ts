import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		host: true,
		port: 2726,
		fs: {
			allow: [process.env.DATA_DIR || './data']
		}
	},
	ssr: {
		// Force bundling of CJS packages that don't work well with ESM interop
		noExternal: ['@nozbe/microfuzz'],
		optimizeDeps: {
			include: ['@nozbe/microfuzz']
		}
	}
});
