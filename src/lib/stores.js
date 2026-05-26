import { writable } from 'svelte/store';

export const randomIdeaArrayStore = writable(/** @type {string[]} */ ([]));
export const randomProgressArrayStore = writable(/** @type {string[]} */ ([]));
export const authSessionStore = writable(
	/** @type {{ token: string; expiresAt: number }} */ ({ token: '', expiresAt: 0 })
);
