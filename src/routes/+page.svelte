<script lang="ts">
	import { onMount } from 'svelte';
	import { randomIdeaArrayStore, randomProgressArrayStore } from '$lib/stores';
	import { goto } from '$app/navigation';

	let ideaTalkInput = '';
	let progressTalkInput = '';
	let randomIdealTalkArray: string[] = [];
	let randomProgressTalkArray: string[] = [];

	onMount(() => {
		randomIdeaArrayStore.subscribe((value) => {
			randomIdealTalkArray = value;
		});
		randomProgressArrayStore.subscribe((value) => {
			randomProgressTalkArray = value;
		});
		ideaTalkInput = localStorage.getItem('randomIdeaName') || '';
		progressTalkInput = localStorage.getItem('randomProgressName') || '';
	});

  

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
			localStorage.setItem('randomIdeaName', ideaTalkInput);
		}
		if (progressNameArray.length > 0) {
			randomProgressTalkArray = shuffleArray(progressNameArray);
			randomProgressArrayStore.set(randomProgressTalkArray);
			localStorage.setItem('randomProgressName', progressTalkInput);
		}
	}

	function startPresentation(category: string) {
		if (category === 'idea') {
			goto('presentation/ideatalk');
		} else {
			goto('presentation/progresstalk');
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
	</div>
  {#if randomIdealTalkArray.length > 0 || randomProgressTalkArray.length > 0}
	  <hr class="my-4 border-red-500 border-2 rounded" />
    <p class="text-2xl font-bold">Here is the order</p>
  {/if}

	{#if randomIdealTalkArray.length > 0}
		<div class="flex items-center gap-2 my-4">
			<p class="text-sm font-semibold">IdeaTalk</p>
      <button
				class="bg-red-500 hover:bg-orange-500 text-white px-2 rounded text-sm flex items-center"
				on:click={() => startPresentation('idea')}
				><span class="material-symbols-rounded text-sm"> co_present </span></button
			>
		</div>
		<ol class="list-decimal list-inside">
			{#each randomIdealTalkArray as item}
				<li>{item}</li>
			{/each}
		</ol>
	{/if}

	{#if randomProgressTalkArray.length > 0}
		<div class="flex items-center gap-2 my-4">
			<p class="text-sm font-semibold">ProgressTalk</p>
			<button
				class="bg-red-500 hover:bg-orange-500 text-white px-2 rounded text-sm flex items-center"
				on:click={() => startPresentation('progress')}
				><span class="material-symbols-rounded text-sm"> co_present </span></button
			>
		</div>
		<ol class="list-decimal list-inside">
			{#each randomProgressTalkArray as item}
				<li>{item}</li>
			{/each}
		</ol>
	{/if}
</div>
