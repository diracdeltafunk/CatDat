const minute_limit = 2
const hour_limit = 10

type Bucket = {
	minute_count: number
	hour_count: number
	minute_start: number
	hour_start: number
}

const ip_store = new Map<string, Bucket>()

export function rate_limit(ip: string): boolean {
	const now = Date.now()
	let entry = ip_store.get(ip)

	if (!entry) {
		entry = {
			minute_count: 0,
			hour_count: 0,
			minute_start: now,
			hour_start: now,
		}
		ip_store.set(ip, entry)
	}

	if (now - entry.minute_start > 60 * 1000) {
		entry.minute_start = now
		entry.minute_count = 0
	}

	if (now - entry.hour_start > 60 * 60 * 1000) {
		entry.hour_start = now
		entry.hour_count = 0
	}

	if (entry.minute_count >= minute_limit || entry.hour_count >= hour_limit) {
		return false
	}

	entry.minute_count += 1
	entry.hour_count += 1

	return true
}
