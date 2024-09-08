<script lang="ts">
	import { randomIdeaArrayStore } from '$lib/stores';
	import { onMount } from 'svelte';
	let randomArray: string[] = [];
	let currentPresenterIndex = 0;
	let currentPresenter = '';
	let nextPresenter = '';
	let customMinutes = 3; // Default input value in minutes (3)
	let timer = Math.floor(customMinutes * 60);
	let timerInterval: number | undefined;
	let isRunning = false;

	onMount(() => {
		randomIdeaArrayStore.subscribe((value) => {
			randomArray = value;
			if (randomArray.length > 0) {
				currentPresenter = randomArray[0];
				nextPresenter = randomArray[1];
			}
		});
	});

	function formatTime(seconds: number) {
		const minutes = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}

	function pauseTimer() {
		clearInterval(timerInterval);
		isRunning = false;
	}

	function startPauseTimer() {
		if (isRunning) {
			clearInterval(timerInterval);
			isRunning = false;
		} else {
			isRunning = true;
			timerInterval = setInterval(() => {
        const speechSynthesis = window.speechSynthesis;
				if (timer > 0) {
					timer--;
					if (timer === 60) {
            let speechUtterance = new SpeechSynthesisUtterance('One minute left');
            speechSynthesis.speak(speechUtterance);
					}
				} else {
          let speechUtterance = new SpeechSynthesisUtterance('Time is up');
          speechSynthesis.speak(speechUtterance);
					next();
				}
			}, 1000);
		}
	}

	function next() {
		pauseTimer();
		if (currentPresenterIndex < randomArray.length - 1) {
			currentPresenterIndex++;
			currentPresenter = randomArray[currentPresenterIndex];
			nextPresenter = randomArray[currentPresenterIndex + 1];
			resetTimer();
		} else {
			alert('Presentation complete!');
		}
	}

	function resetTimer() {
		timer = Math.floor(customMinutes * 60);
		isRunning = false;
	}

	function addTime() {
		timer += 60;
	}

	function updateCustomTimer() {
		timer = Math.floor(customMinutes * 60);
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
					on:click={addTime}
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
