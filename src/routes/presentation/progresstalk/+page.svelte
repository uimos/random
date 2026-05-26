<script lang="ts">
	import { authSessionStore, randomProgressArrayStore } from '$lib/stores';
	import TimerWorker from '$lib/timerWorker.ts?worker';
	import QRCode from 'qrcode';
	import { onMount } from 'svelte';
	let randomArray: string[] = [];
	const PROGRESS_ORDER_KEY = 'randomProgressOrder';
	const EXTERNAL_API_BASE_URL = (import.meta.env.VITE_EXTERNAL_API_BASE_URL || '').replace(/\/$/, '');
	let currentPresenterIndex = 0;
	let currentPresenter = '';
	let nextPresenter = '';
	let customMinutes = 10; // Default input value in minutes (10)
	let timer = Math.floor(customMinutes * 60);
	let isRunning = false;
	let worker: Worker | undefined;
	let isGeneratingActivationLink = false;
	let activationError = '';
	let activationResponse: { url: string; member_name?: string; expires_in?: number } | null = null;
	let qrCodeDataUrl = '';
	let isQrWidgetMinimized = false;
	let hasCopiedLink = false;
	const SESSION_STORAGE_KEY = 'publicApiSession';

	function getValidSharedSessionToken(): string {
		if ($authSessionStore.token && Date.now() < $authSessionStore.expiresAt) {
			return $authSessionStore.token;
		}
		return '';
	}

	function clearSharedSessionToken() {
		authSessionStore.set({ token: '', expiresAt: 0 });
		sessionStorage.removeItem(SESSION_STORAGE_KEY);
	}

	async function activateWithToken(sessionToken: string) {
		const activateResponse = await fetch(`${EXTERNAL_API_BASE_URL}/api/v1/public/activate`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${sessionToken}`
			},
			body: JSON.stringify({ name: currentPresenter })
		});

		if (!activateResponse.ok) {
			if (activateResponse.status === 400) {
				throw new Error('Presenter name is required.');
			} else if (activateResponse.status === 404) {
				throw new Error('Name not found in HackTrack.');
			}
			const detail = await activateResponse.text();
			throw new Error(`Activate failed (${activateResponse.status}): ${detail}`);
		}

		return activateResponse.json();
	}

	function getSavedOrder(): string[] {
		const raw = localStorage.getItem(PROGRESS_ORDER_KEY);
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

	function updatePresenters() {
		if (randomArray.length > 0) {
			currentPresenter = randomArray[0];
			nextPresenter = randomArray[1];
			clearActivationState();
			void generateActivationLink();
		}
	}

	function clearActivationState() {
		activationError = '';
		activationResponse = null;
		qrCodeDataUrl = '';
		hasCopiedLink = false;
	}

	onMount(() => {
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

		randomProgressArrayStore.subscribe((value) => {
			randomArray = value;
			updatePresenters();
		});

		if (randomArray.length === 0) {
			const savedOrder = getSavedOrder();
			if (savedOrder.length > 0) {
				randomProgressArrayStore.set(savedOrder);
			}
		}
	});

	function formatTime(seconds: number) {
		const minutes = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}

	function pauseTimer() {
		if (worker) {
			worker.postMessage({ action: 'stop' });
			isRunning = false;
		}
	}

	function startPauseTimer() {
		if (!worker) {
			worker = new TimerWorker();
			worker.addEventListener('message', (event) => {
				const speechSynthesis = window.speechSynthesis;
				let speechUtterance;
				if (event.data.message === 'update') {
					timer = event.data.timer;
				} else if (event.data.message === 'One minute left') {
					speechUtterance = new SpeechSynthesisUtterance('One minute left');
				} else if (event.data.message === 'Time is up') {
					speechUtterance = new SpeechSynthesisUtterance('Time is up');
					next();
				}
				if (speechUtterance) {
					speechSynthesis.speak(speechUtterance);
				}
			});
		}

		if (isRunning) {
			worker.postMessage({ action: 'stop' });
			isRunning = false;
		} else {
			isRunning = true;
			worker.postMessage({ action: 'start', timer });
		}
	}

	function next() {
		pauseTimer();
		if (currentPresenterIndex < randomArray.length - 1) {
			currentPresenterIndex++;
			currentPresenter = randomArray[currentPresenterIndex];
			nextPresenter = randomArray[currentPresenterIndex + 1];
			clearActivationState();
			resetTimer();
			void generateActivationLink();
		} else {
			alert('Presentation complete!');
		}
	}

	function resetTimer() {
		timer = Math.floor(customMinutes * 60);
		isRunning = false;
	}

	function addTime(additionalTime: number) {
		if (worker) {
			worker.postMessage({ action: 'addTime', additionalTime });
		}
	}

	function updateCustomTimer() {
		timer = Math.floor(customMinutes * 60);
	}

	async function copyActivationUrl() {
		if (!activationResponse?.url) return;
		await navigator.clipboard.writeText(activationResponse.url);
		hasCopiedLink = true;
	}

	async function generateActivationLink() {
		activationError = '';
		activationResponse = null;
		qrCodeDataUrl = '';

		if (!EXTERNAL_API_BASE_URL) {
			activationError = 'Missing VITE_EXTERNAL_API_BASE_URL configuration.';
			return;
		}

		if (!currentPresenter.trim()) {
			activationError = 'No current presenter found.';
			return;
		}

		isGeneratingActivationLink = true;

		try {
			const sessionToken = getValidSharedSessionToken();
			if (!sessionToken) {
				activationError = 'Session token missing or expired. Please authenticate on the main page.';
				return;
			}

			let activatePayload;
			try {
				activatePayload = await activateWithToken(sessionToken);
			} catch (error) {
				const message = error instanceof Error ? error.message : '';
				if (message.includes('401') || message.toLowerCase().includes('unauthorized')) {
					clearSharedSessionToken();
					activationError = 'Session expired. Please re-authenticate on the main page.';
					return;
				} else {
					throw error;
				}
			}

			if (!activatePayload?.url) {
				throw new Error('Activate response does not contain url.');
			}

			activationResponse = {
				url: activatePayload.url,
				member_name: activatePayload.member_name,
				expires_in: activatePayload.expires_in
			};
			hasCopiedLink = false;

			qrCodeDataUrl = await QRCode.toDataURL(activatePayload.url, {
				width: 280,
				margin: 1
			});
		} catch (error) {
			activationError = error instanceof Error ? error.message : 'Unknown error while generating link.';
		} finally {
			isGeneratingActivationLink = false;
		}
	}
</script>

<div class="bg-stone-50 text-black rounded p-8 m-8">
	{#if randomArray.length > 0}
		<div class="my-4">
			<div class="flex flex-row">
				<p class="flex-1">Current: <span class="font-bold text-lg">{currentPresenter}</span></p>
				{#if nextPresenter}
					<p>Next: <span class="font-bold text-lg">{nextPresenter}</span></p>
				{/if}
			</div>
			<p class="monospace text-5xl sm:text-9xl text-center">{formatTime(timer)}</p>
			<div class="text-xs text-center">
				Custom timer (minutes):
				<input
					id="timeInput"
					type="number"
					bind:value={customMinutes}
					on:input={updateCustomTimer}
					min="1"
					class="border p-1 text-xs rounded w-12"
					disabled={isRunning}
				/>
			</div>
			<div class="flex gap-2 justify-center flex-wrap my-4">
				<button
					class="bg-red-500 hover:bg-orange-500 text-white py-2 px-4 rounded text-sm flex items-center mb-2"
					on:click={startPauseTimer}
				>
					{#if isRunning}
						<span class="material-symbols-rounded"> pause </span> Pause timer
					{:else}
						<span class="material-symbols-rounded"> play_arrow </span> Start timer
					{/if}
				</button>
				<button
					class="bg-red-500 hover:bg-orange-500 text-white py-2 px-4 rounded text-sm flex items-center mb-2"
					on:click={() => addTime(60)}
					><span class="material-symbols-rounded"> exposure_plus_1 </span>minute</button
				>
				<button
					class="bg-red-500 hover:bg-orange-500 text-white py-2 px-4 rounded text-sm flex items-center mb-2"
					on:click={next}
					><span class="material-symbols-rounded"> skip_next </span>Next presenter</button
				>
			</div>

			<hr class="my-4 border-red-500 border-2 rounded" />

			{#if randomArray.slice(currentPresenterIndex + 1).length > 0}
				<p class="font-bold">Upcoming presenter:</p>
				<ul>
					{#each randomArray.slice(currentPresenterIndex + 1) as presenter}
						<li>
							{presenter}
						</li>
					{/each}
				</ul>
			{:else}
				<p>No presenter available for the presentation.</p>
			{/if}
		</div>
	{:else}
		<div class="my-4">
			<p>No presenter available for the presentation.</p>
		</div>
	{/if}
	<button
		class="bg-red-500 hover:bg-orange-500 text-white py-2 px-4 rounded"
		on:click={() => history.back()}>Back</button
	>
</div>

<div
	class={`fixed right-4 z-50 text-black ${isQrWidgetMinimized ? 'bottom-16 w-auto max-w-none' : 'bottom-20 w-80 max-w-[calc(100vw-2rem)]'}`}
>
	{#if isQrWidgetMinimized}
		<button
			class="bg-red-500 hover:bg-orange-500 text-white px-4 py-2 rounded-full shadow-lg text-sm"
			on:click={() => (isQrWidgetMinimized = false)}
		>
			Recent talk
		</button>
	{:else}
		<div class="border border-red-200 rounded p-4 bg-white shadow-lg">
			<div class="flex items-center justify-between mb-2">
				<p class="font-semibold">This member's recent talk:</p>
				<button
					class="text-xs px-2 py-1 border border-stone-300 rounded hover:bg-stone-100"
					on:click={() => (isQrWidgetMinimized = true)}
				>
					Minimize
				</button>
			</div>

			{#if isGeneratingActivationLink}
				<p class="text-xs text-slate-600 mb-2">Generating link...</p>
			{/if}

			{#if activationError}
				<p class="text-red-600 text-sm mt-2">{activationError}</p>
			{/if}

			{#if activationResponse && qrCodeDataUrl}
				<div class="mt-4 bg-stone-50 border border-stone-200 rounded p-3">
					{#if activationResponse.member_name}
						<p class="text-xs font-semibold">Member: {activationResponse.member_name}</p>
					{/if}
					{#if activationResponse.expires_in}
						<p class="text-xs mt-1">Expires in: {activationResponse.expires_in}</p>
					{/if}
					<div class="flex items-center gap-2 mt-2">
						<button
							class="bg-stone-200 hover:bg-stone-300 text-black py-1 px-3 rounded text-xs"
							on:click={copyActivationUrl}
						>
							Copy link
						</button>
						{#if hasCopiedLink}
							<p class="text-xs text-green-700">Copied</p>
						{/if}
					</div>
					<img src={qrCodeDataUrl} alt="Member activation QR code" class="rounded w-full h-auto mt-3" />
				</div>
			{/if}
		</div>
	{/if}
</div>
