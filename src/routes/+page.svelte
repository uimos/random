<script lang="ts">
	import { onMount } from 'svelte';
	import { authSessionStore, randomIdeaArrayStore, randomProgressArrayStore } from '$lib/stores';
	import { goto } from '$app/navigation';

	let ideaTalkInput = '';
	let progressTalkInput = '';
	let randomIdealTalkArray: string[] = [];
	let randomProgressTalkArray: string[] = [];
	let isExtracting = false;
	let apiPassword = '';
	let isAuthenticating = false;
	let authError = '';
	let isSessionValid = false;
	const IDEA_ORDER_KEY = 'randomIdeaOrder';
	const PROGRESS_ORDER_KEY = 'randomProgressOrder';
	const SESSION_STORAGE_KEY = 'publicApiSession';
	const EXTERNAL_API_BASE_URL = (import.meta.env.VITE_EXTERNAL_API_BASE_URL || '').replace(/\/$/, '');

	const DEFAULT_SESSION_TOKEN_TTL_SECONDS = 2 * 60 * 60; // 2 hours

	function getSessionTokenFromAuthPayload(authenticatePayload: any): string {
		return (
			authenticatePayload?.session_token ||
			''
		);
	}

	function getSessionTokenExpiryFromAuthPayload(authenticatePayload: any): number {
		const expiresInSeconds = Number(
			authenticatePayload?.expires_in ||
			DEFAULT_SESSION_TOKEN_TTL_SECONDS
		);

		const safeSeconds =
			Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
				? expiresInSeconds
				: DEFAULT_SESSION_TOKEN_TTL_SECONDS;

		const refreshBufferSeconds = 10;
		return Date.now() + Math.max(1, safeSeconds - refreshBufferSeconds) * 1000;
	}

	function saveSession(session: { token: string; expiresAt: number }) {
		authSessionStore.set(session);
		sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
	}

	function clearSession() {
		authSessionStore.set({ token: '', expiresAt: 0 });
		sessionStorage.removeItem(SESSION_STORAGE_KEY);
	}

	$: isSessionValid = $authSessionStore.token.length > 0 && Date.now() < $authSessionStore.expiresAt;

	function loadStoredOrder(key: string): string[] {
		const raw = localStorage.getItem(key);
		if (!raw) return [];

		try {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed)) {
				return parsed.filter((item): item is string => typeof item === 'string');
			}
		} catch {
			return [];
		}

		return [];
	}

	function moveItem(array: string[], fromIndex: number, toIndex: number): string[] {
		const copied = [...array];
		const [moved] = copied.splice(fromIndex, 1);
		copied.splice(toIndex, 0, moved);
		return copied;
	}

	let draggingIdeaIndex: number | null = null;
	let dragOverIdeaIndex: number | null = null;
	let draggingProgressIndex: number | null = null;
	let dragOverProgressIndex: number | null = null;

	function saveIdeaOrder(array: string[]) {
		randomIdealTalkArray = array;
		randomIdeaArrayStore.set(array);
		localStorage.setItem(IDEA_ORDER_KEY, JSON.stringify(array));
	}

	function saveProgressOrder(array: string[]) {
		randomProgressTalkArray = array;
		randomProgressArrayStore.set(array);
		localStorage.setItem(PROGRESS_ORDER_KEY, JSON.stringify(array));
	}

	onMount(() => {
		randomIdeaArrayStore.subscribe((value) => {
			randomIdealTalkArray = value;
		});
		randomProgressArrayStore.subscribe((value) => {
			randomProgressTalkArray = value;
		});

		const savedIdeaOrder = loadStoredOrder(IDEA_ORDER_KEY);
		if (savedIdeaOrder.length > 0) {
			randomIdeaArrayStore.set(savedIdeaOrder);
		}

		const savedProgressOrder = loadStoredOrder(PROGRESS_ORDER_KEY);
		if (savedProgressOrder.length > 0) {
			randomProgressArrayStore.set(savedProgressOrder);
		}

		ideaTalkInput = localStorage.getItem('randomIdeaName') || '';
		progressTalkInput = localStorage.getItem('randomProgressName') || '';

		const storedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
		if (storedSession) {
			try {
				const parsed = JSON.parse(storedSession);
				if (typeof parsed?.token === 'string' && typeof parsed?.expiresAt === 'number') {
					authSessionStore.set({ token: parsed.token, expiresAt: parsed.expiresAt });
				}
			} catch {
				sessionStorage.removeItem(SESSION_STORAGE_KEY);
			}
		}
	});

	async function authenticateSession() {
		authError = '';
		if (!EXTERNAL_API_BASE_URL) {
			authError = 'Missing VITE_EXTERNAL_API_BASE_URL configuration.';
			return;
		}

		if (!apiPassword.trim()) {
			authError = 'Please enter password.';
			return;
		}

		isAuthenticating = true;
		try {
			const authenticateResponse = await fetch(`${EXTERNAL_API_BASE_URL}/api/v1/public/authenticate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ password: apiPassword })
			});

			if (!authenticateResponse.ok) {
				if (authenticateResponse.status === 401) {
					throw new Error('Wrong password.');
				}
				if (authenticateResponse.status === 400) {
					throw new Error('Password is required.');
				}
				const detail = await authenticateResponse.text();
				throw new Error(`Authenticate failed (${authenticateResponse.status}): ${detail}`);
			}

			const authenticatePayload = await authenticateResponse.json();
			const sessionToken = getSessionTokenFromAuthPayload(authenticatePayload);

			if (!sessionToken) {
				throw new Error('Authenticate response does not contain session token.');
			}

			saveSession({
				token: sessionToken,
				expiresAt: getSessionTokenExpiryFromAuthPayload(authenticatePayload)
			});
			apiPassword = '';
		} catch (error) {
			authError = error instanceof Error ? error.message : 'Authentication failed.';
			clearSession();
		} finally {
			isAuthenticating = false;
		}
	}

	function handlePasswordKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			void authenticateSession();
		}
	}

	function shuffleArray(array: string[]) {
		for (var i = array.length - 1; i > 0; i--) {
			var j = Math.floor(Math.random() * (i + 1));
			var temp = array[i];
			array[i] = array[j];
			array[j] = temp;
		}
		return array;
	}

	function submit() {
		let ideaNameArray = ideaTalkInput.split(/,|\n/).filter((item) => item.trim() !== '');
		let progressNameArray = progressTalkInput.split(/,|\n/).filter((item) => item.trim() !== '');
		if (ideaNameArray.length > 0) {
			randomIdealTalkArray = shuffleArray(ideaNameArray);
			randomIdeaArrayStore.set(randomIdealTalkArray);
			localStorage.setItem(IDEA_ORDER_KEY, JSON.stringify(randomIdealTalkArray));
			localStorage.setItem('randomIdeaName', ideaTalkInput);
		}
		if (progressNameArray.length > 0) {
			randomProgressTalkArray = shuffleArray(progressNameArray);
			randomProgressArrayStore.set(randomProgressTalkArray);
			localStorage.setItem(PROGRESS_ORDER_KEY, JSON.stringify(randomProgressTalkArray));
			localStorage.setItem('randomProgressName', progressTalkInput);
		}
	}

	function handleIdeaDragStart(index: number) {
		draggingIdeaIndex = index;
	}

	function handleIdeaDragOver(event: DragEvent, index: number) {
		event.preventDefault();
		dragOverIdeaIndex = index;
	}

	function handleIdeaDrop(index: number) {
		if (draggingIdeaIndex === null || draggingIdeaIndex === index) {
			draggingIdeaIndex = null;
			dragOverIdeaIndex = null;
			return;
		}

		saveIdeaOrder(moveItem(randomIdealTalkArray, draggingIdeaIndex, index));
		draggingIdeaIndex = null;
		dragOverIdeaIndex = null;
	}

	function handleIdeaDragEnd() {
		draggingIdeaIndex = null;
		dragOverIdeaIndex = null;
	}

	function handleProgressDragStart(index: number) {
		draggingProgressIndex = index;
	}

	function handleProgressDragOver(event: DragEvent, index: number) {
		event.preventDefault();
		dragOverProgressIndex = index;
	}

	function handleProgressDrop(index: number) {
		if (draggingProgressIndex === null || draggingProgressIndex === index) {
			draggingProgressIndex = null;
			dragOverProgressIndex = null;
			return;
		}

		saveProgressOrder(moveItem(randomProgressTalkArray, draggingProgressIndex, index));
		draggingProgressIndex = null;
		dragOverProgressIndex = null;
	}

	function handleProgressDragEnd() {
		draggingProgressIndex = null;
		dragOverProgressIndex = null;
	}

	function startPresentation(category: string) {
		if (category === 'idea') {
			goto('presentation/ideatalk/');
		} else {
			goto('presentation/progresstalk/');
		}
	}

	function clearAll() {
		randomIdeaArrayStore.set([]);
		randomProgressArrayStore.set([]);
		ideaTalkInput = '';
		progressTalkInput = '';
		randomIdealTalkArray = [];
		randomProgressTalkArray = [];
		localStorage.removeItem('randomIdeaName');
		localStorage.removeItem('randomProgressName');
		localStorage.removeItem(IDEA_ORDER_KEY);
		localStorage.removeItem(PROGRESS_ORDER_KEY);
		clearSession();
	}

	async function extractFormResponses() {
		let ideaTalks: string[] = [];
		let progressTalks: string[] = [];
		let url: string =
			'https://script.google.com/macros/s/AKfycbwzW7HkzwOnFGcKGKL4Hbi5WebdtXLs8HJsWPtnPi416remuW5Bgg1mVXrpHuR_sHoy/exec';

		isExtracting = true;
		let formResponses = await fetch(url);
		let formResult = await formResponses.json();

		Object.keys(formResult).forEach((idx: string) => {
			console.log(formResult[idx].Name);
			if (formResult[idx]['Type of talk'] === 'IdeaTalk') {
				ideaTalks.push(formResult[idx].Name);
			} else {
				progressTalks.push(formResult[idx].Name);
			}
		});

		ideaTalkInput = ideaTalks.join('\n');
		progressTalkInput = progressTalks.join('\n');
		isExtracting = false;
	}
</script>

<svelte:head>
	<title>Who presents first?</title>
</svelte:head>

<div class="bg-stone-50 text-black rounded p-8 m-8">
	<p class="text-3xl font-bold leading-loose text-slate-700">So, who presents first?</p>
	<p class="my-4">
		About the random algorithm
		<a
			href="http://en.wikipedia.org/wiki/Fisher-Yates_shuffle#The_modern_algorithm"
			target="_blank"
		>
			here
		</a>
	</p>
	<div class="my-4 p-3 border border-stone-300 rounded bg-white">
		<div class="flex gap-2 flex-wrap items-center text-sm">
			<p class="text-xs">{isSessionValid ? '🟢' : '🔴'}</p>
			<p class="font-semibold">
				{isSessionValid
					? 'Logged in (HackTrack context for ProgressTalks)'
					: 'Login (HackTrack context for ProgressTalks)'}
			</p>
			{#if !isSessionValid}
				<input
					id="mainApiPassword"
					type="password"
					bind:value={apiPassword}
					placeholder="Password"
					class="text-black p-2 rounded border border-stone-300"
					on:keydown={handlePasswordKeydown}
				/>
				<button
					class="bg-red-500 hover:bg-orange-500 text-white py-2 px-4 rounded"
					on:click={authenticateSession}
					disabled={isAuthenticating}
				>
					{isAuthenticating ? 'Logging in...' : 'Login'}
				</button>
			{/if}
		</div>
		{#if authError}
			<p class="text-red-600 text-sm mt-2">{authError}</p>
		{/if}
	</div>
	<div class="textarea flex gap-2 w-full my-4">
		<div class="w-1/2">
			<p class="font-semibold my-2 text-sm">IdeaTalk</p>
			<textarea
				bind:value={ideaTalkInput}
				class="text-black p-2 w-full rounded border-slate-300 border-2 monospace"
				placeholder="eg.
Alan
Bob
Charlie
Danny"
				rows="5"
			></textarea>
		</div>
		<div class="w-1/2">
			<p class="font-semibold my-2 text-sm">ProgressTalk</p>
			<textarea
				bind:value={progressTalkInput}
				class="text-black p-2 w-full rounded border-slate-300 border-2 monospace"
				placeholder="eg.
Alan
Bob
Charlie
Danny"
				rows="5"
			></textarea>
		</div>
	</div>
	<div class="flex gap-2">
		<button
			class="bg-red-500 hover:bg-orange-500 text-white py-2 px-4 rounded text-sm flex items-center mb-2"
			on:click={submit}
		>
			Submit
		</button>
		<button
			class="bg-red-500 hover:bg-orange-500 text-white py-2 px-4 rounded text-sm flex items-center mb-2"
			on:click={clearAll}
		>
			Clear All
		</button>
		<button
			class="bg-red-500 hover:bg-orange-500 text-white py-2 px-4 rounded text-sm flex items-center mb-2"
			on:click={extractFormResponses}
		>
			{isExtracting ? 'Extracting...' : 'Extract'}
		</button>
	</div>
	{#if randomIdealTalkArray.length > 0 || randomProgressTalkArray.length > 0}
		<hr class="my-4 border-red-500 border-2 rounded" />
		<p class="text-2xl font-bold">Here is the order</p>
	{/if}

	{#if randomIdealTalkArray.length > 0}
		<div class="flex items-center gap-2 my-4">
			<p class="text-sm font-semibold">IdeaTalk</p>
			<p class="text-xs text-slate-500">Drag rows to reorder</p>
			<button
				class="bg-red-500 hover:bg-orange-500 text-white px-2 rounded text-sm flex items-center"
				on:click={() => startPresentation('idea')}
				><span class="material-symbols-rounded text-sm"> co_present </span></button
			>
		</div>
		<ol class="space-y-2">
			{#each randomIdealTalkArray as item, index}
				<li
					class="flex items-center gap-2 border rounded p-2 bg-white cursor-move {dragOverIdeaIndex === index ? 'border-red-400 border-2' : ''}"
					draggable="true"
					on:dragstart={() => handleIdeaDragStart(index)}
					on:dragover={(event) => handleIdeaDragOver(event, index)}
					on:drop={() => handleIdeaDrop(index)}
					on:dragend={handleIdeaDragEnd}
				>
					<span class="w-6 text-right">{index + 1}.</span>
					<span class="material-symbols-rounded text-sm text-slate-500"> drag_indicator </span>
					<span class="flex-1">{item}</span>
				</li>
			{/each}
		</ol>
	{/if}

	{#if randomProgressTalkArray.length > 0}
		<div class="flex items-center gap-2 my-4">
			<p class="text-sm font-semibold">ProgressTalk</p>
			<p class="text-xs text-slate-500">Drag rows to reorder</p>
			<button
				class="bg-red-500 hover:bg-orange-500 text-white px-2 rounded text-sm flex items-center"
				on:click={() => startPresentation('progress')}
				><span class="material-symbols-rounded text-sm"> co_present </span></button
			>
		</div>
		<ol class="space-y-2">
			{#each randomProgressTalkArray as item, index}
				<li
					class="flex items-center gap-2 border rounded p-2 bg-white cursor-move {dragOverProgressIndex === index ? 'border-red-400 border-2' : ''}"
					draggable="true"
					on:dragstart={() => handleProgressDragStart(index)}
					on:dragover={(event) => handleProgressDragOver(event, index)}
					on:drop={() => handleProgressDrop(index)}
					on:dragend={handleProgressDragEnd}
				>
					<span class="w-6 text-right">{index + 1}.</span>
					<span class="material-symbols-rounded text-sm text-slate-500"> drag_indicator </span>
					<span class="flex-1">{item}</span>
				</li>
			{/each}
		</ol>
	{/if}
</div>
