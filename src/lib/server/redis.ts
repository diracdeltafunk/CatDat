import { dev } from '$app/environment'
import { REDIS_URL } from '$env/static/private'
import Redis from 'ioredis'

export const redis = new Redis(REDIS_URL, {
	tls: { rejectUnauthorized: !dev },
})

const rate_limit_max = 2
const rate_limit_window = 60
const rate_limit_violation_window = 60 * 60
const rate_limit_violation_threshold = 5
const block_ttl = 60 * 60 * 24 * 30

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

export async function flag_rate_limit_violation(ip: string) {
	const key = `rate_limit_violations:ip:${ip}`

	const violations = await redis.incr(key)

	if (violations === 1) {
		await redis.expire(key, rate_limit_violation_window)
	}

	if (violations >= rate_limit_violation_threshold) {
		await redis.set(`blocked:ip:${ip}`, '1', 'EX', block_ttl)
	}
}
