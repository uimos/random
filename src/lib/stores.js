import { writable } from 'svelte/store';

export const randomIdeaArrayStore = writable(/** @type {string[]} */ ([]));
export const randomProgressArrayStore = writable(/** @type {string[]} */ ([]));
