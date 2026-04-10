import { dev } from '$app/environment'
import { REDIS_URL } from '$env/static/private'
import Redis from 'ioredis'
import profanity_filter from 'leo-profanity'

export const redis = new Redis(REDIS_URL, {
	tls: { rejectUnauthorized: !dev },
})

const rate_limit_max = 2
const rate_limit_window = 60
const violation_window = 60 * 60
const rate_limit_violation_limit = 5
const profanity_violation_limit = 2
const block_window = 60 * 60 * 24 * 30

export async function is_blocked(ip: string) {
	return (await redis.get(`blocked:ip:${ip}`)) === '1'
}

export async function rate_limit(ip: string) {
	const key = `rate_limit:ip:${ip}`

	const count = await redis.incr(key)

	if (count === 1) {
		await redis.expire(key, rate_limit_window)
	}

	return count <= rate_limit_max
}

export async function flag_violation(ip: string, type: 'rate_limit' | 'profanity') {
	const key = `violation:ip:${ip}:${type}`

	const violations = await redis.incr(key)

	if (violations === 1) {
		await redis.expire(key, violation_window)
	}

	if (type === 'rate_limit' && violations >= rate_limit_violation_limit) {
		await redis.set(`blocked:ip:${ip}`, '1', 'EX', block_window)
	}

	if (type === 'profanity' && violations >= profanity_violation_limit) {
		await redis.set(`blocked:ip:${ip}`, '1', 'EX', block_window)
	}
}

export function has_profanity(title: string, body: string) {
	const text = `${title}\n${body}`.toLowerCase()
	return profanity_filter.check(text)
}
