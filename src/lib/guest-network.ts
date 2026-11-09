/** Trusted edge address for free-trial deduplication. IPv6 privacy addresses share a /64. */
export function guestNetworkAddress(request: Request, legacy = false) {
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname)
  const ip = request.headers.get('cf-connecting-ip')?.trim().toLowerCase() || (local ? 'local-development' : '')
  if (!ip || ip.length > 64) throw new Error('Guest network unavailable')
  // Keep historical IPv4 keys and provide the old exact-address key for claim lookup.
  if (legacy || !ip.includes(':')) return ip
  if (!/^[a-f0-9:.]+$/.test(ip)) throw new Error('Invalid guest network')
  const canonical = new URL(`http://[${ip}]/`).hostname.slice(1, -1)
  const [left, right] = canonical.split('::')
  const start = left ? left.split(':') : [], end = right ? right.split(':') : []
  const words = right === undefined ? start : [...start, ...Array(8 - start.length - end.length).fill('0'), ...end]
  if (words.length !== 8) throw new Error('Invalid guest network')
  const numbers = words.map(word => parseInt(word, 16))
  // Do not group every IPv4-mapped address into the same IPv6 prefix.
  if (numbers.slice(0, 5).every(word => word === 0) && numbers[5] === 0xffff) {
    return [numbers[6] >> 8, numbers[6] & 255, numbers[7] >> 8, numbers[7] & 255].join('.')
  }
  return `${numbers.slice(0, 4).map(word => word.toString(16)).join(':')}::/64`
}
