import { json } from '@sveltejs/kit'
import { App } from '@octokit/app'
import { GITHUB_PRIVATE_KEY } from '$env/static/private'
import { rate_limit } from '$lib/server/ratelimit'
import {
	GITHUB_APP_ID,
	GITHUB_INSTALLATION_ID,
	GITHUB_OWNER,
	GITHUB_REPO,
} from './config'

const app = new App({
	appId: GITHUB_APP_ID,
	privateKey: GITHUB_PRIVATE_KEY,
})

export const POST = async (event) => {
	const ip = event.getClientAddress()

	if (!rate_limit(ip)) {
		return json(
			{ error: 'Too many requests. Please try again later.' },
			{ status: 429 },
		)
	}

	const data = await get_data(event.request)

	if (!data) return json({ error: 'Invalid request body' }, { status: 400 })

	const { title, body } = data

	try {
		const octokit = await app.getInstallationOctokit(Number(GITHUB_INSTALLATION_ID))

		const issue = await octokit.request('POST /repos/{owner}/{repo}/issues', {
			owner: GITHUB_OWNER,
			repo: GITHUB_REPO,
			title,
			body,
		})

		return json({ url: issue.data.html_url })
	} catch (err) {
		console.error(err)
		return json({ error: 'Issue could not be created' }, { status: 502 })
	}
}

async function get_data(request: Request) {
	try {
		const data = await request.json()
		const { title, body } = data
		if (!title || typeof title !== 'string') return null
		if (!body || typeof body !== 'string') return null
		return { title, body }
	} catch (_) {
		return null
	}
}
