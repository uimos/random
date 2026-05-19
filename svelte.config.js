import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
        preprocess: vitePreprocess(),

        kit: {
                adapter: adapter({
                        pages: 'build',
                        assets: 'build',
                        fallback: 'index.html'
                }),
                paths: {
                        base: '/random'
                },
                prerender: {
                        handleMissingId: 'warn',
                        entries: ['*', '/presentation/ideatalk', '/presentation/progresstalk']
                }
        }
};

export default config;
