import { json } from '@sveltejs/kit'
import { App } from '@octokit/app'
import { GITHUB_PRIVATE_KEY } from '$env/static/private'
import { rate_limit } from '$lib/server/ratelimit'
import {
	BODY_MAX_LENGTH,
	GITHUB_APP_ID,
	GITHUB_INSTALLATION_ID,
	GITHUB_OWNER,
	GITHUB_REPO,
	TITLE_MAX_LENGTH,
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

	const data = await parse_data(event.request)

	if ('error' in data) return json({ error: data.error }, { status: 400 })

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

async function parse_data(
	request: Request,
): Promise<{ error: string } | { title: string; body: string }> {
	let data
	try {
		data = await request.json()
	} catch (_) {
		return { error: 'Invalid request body' }
	}

	const { title, body } = data

	if (!title) return { error: 'Title required' }
	if (!body) return { error: 'Body required' }

	if (typeof title !== 'string') return { error: 'Title must be a string' }
	if (typeof body !== 'string') return { error: 'Body must be a string' }

	if (title.length > TITLE_MAX_LENGTH) {
		return { error: `Title must have at most ${TITLE_MAX_LENGTH} characters` }
	}
	if (body.length > BODY_MAX_LENGTH) {
		return { error: `Body must have at most ${BODY_MAX_LENGTH} characters` }
	}

	return { title, body }
}
