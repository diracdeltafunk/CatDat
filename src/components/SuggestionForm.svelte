<script lang="ts">
	import { page } from '$app/state'
	import { resize_textarea } from '$lib/client/utils'
	import { faCheckCircle, faWarning } from '@fortawesome/free-solid-svg-icons'
	import { tick } from 'svelte'
	import Fa from 'svelte-fa'

	let title = $state('')
	let body = $state('')
	let error = $state('')
	let url = $state('')
	let sending = $state(false)

	async function create_issue(e: SubmitEvent) {
		e.preventDefault()

		sending = true
		error = ''
		url = ''

		try {
			const res = await fetch('/api/issue', {
				method: 'POST',
				body: JSON.stringify({ title, body, url: page.url.href }),
			})

			const res_json = await res.json()

			if ('error' in res_json) {
				error = res_json.error
			} else {
				url = res_json.url
			}
		} catch (err) {
			console.error(err)
			error = 'Failed to fetch API'
		} finally {
			sending = false
			await tick()
			section?.scrollIntoView({
				block: 'end',
				behavior: 'smooth',
			})
		}
	}

	let section = $state<HTMLElement | null>(null)
</script>

<section bind:this={section}>
	<h2>Suggestion Form</h2>

	<p class="hint">
		Use the form below to report missing data, submit an issue, or make a suggestion.
	</p>

	<form onsubmit={create_issue}>
		<div class="form-group">
			<label for="title">Short summary</label>
			<input type="text" id="title" bind:value={title} required />
		</div>

		<div class="form-group">
			<label for="body">Details</label>
			<textarea id="body" {@attach resize_textarea} bind:value={body} required
			></textarea>
		</div>

		<button class="button" disabled={sending}>
			{#if sending}
				Submitting...
			{:else}
				Submit
			{/if}
		</button>
	</form>

	{#if error}
		<p class="error">
			<Fa icon={faWarning} />
			Error: {error}
		</p>
	{/if}

	{#if url}
		<p>
			<Fa icon={faCheckCircle} />
			Your suggestion has been created as a
			<a href={url} target="_blank">GitHub issue</a>. We will review it shortly.
		</p>
	{/if}
</section>

<style>
	section {
		margin-top: 4rem;
		padding-bottom: 1rem;
		margin-bottom: -1rem;
	}

	.error {
		color: var(--error-color);
	}

	input,
	textarea {
		width: 100%;
	}

	.form-group {
		margin-bottom: 1rem;
	}
</style>
