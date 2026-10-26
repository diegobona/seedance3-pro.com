import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import vm from 'node:vm'
import { partnerImageRedirect } from '../app/partner-image-redirect.mjs'
import { localeRedirect } from '../app/site-locale.mjs'
import { recordReferralResponse } from '../src/lib/anyposes-referral-response'
import { createReferralVisitStore, type ReferralVisit } from '../src/db/referral-visits'
import { createD1TestDatabase } from './helpers/d1-test-db'

const guard = readFileSync(new URL('../assets/pose-entry-visibility.js', import.meta.url), 'utf8')

test('an AnyPoses legacy redirect records a 2.5 visit once and counts it with historical old image visits', async () => {
  const h = await createD1TestDatabase()
  try {
    const source = new Request('https://www.seedance3-pro.com/gpt-image-2.html?prompt=a+fox&aspect_ratio=16%3A9&lang=zh', {
      headers: { referer: 'https://anyposes.com/' },
    })
    const redirected = partnerImageRedirect(source)
    assert.ok(redirected)
    const switched = localeRedirect(new Request(redirected.headers.get('location')!), 'US')
    assert.ok(switched)
    const target = new URL(switched.headers.get('location')!)
    assert.equal(target.pathname, '/zh/app/image/gpt-image-2-5-1k')
    assert.equal(target.searchParams.get('prompt'), 'a fox')
    assert.equal(target.searchParams.get('aspect_ratio'), '16:9')
    assert.equal(target.searchParams.get('ref'), 'anyposes')

    const store = createReferralVisitStore(h.db)
    const cookies = new Map<string, string>()
    const pending: Promise<unknown>[] = []
    const recorded: ReferralVisit[] = []
    const document = {
      referrer: '', // Model an external Referer stripped by the redirect chain.
      documentElement: { classList: { add() {}, remove() {} } },
      get cookie() { return [...cookies].map(([key, value]) => `${key}=${value}`).join('; ') },
      set cookie(raw: string) {
        const pair = raw.split(';')[0]
        const index = pair.indexOf('=')
        cookies.set(pair.slice(0, index), pair.slice(index + 1))
      },
    }
    const window = {
      location: target,
      crypto: { randomUUID },
      sessionStorage: { getItem: () => null, setItem() {} },
      fetch: (path: string, options: RequestInit) => {
        assert.equal(path, '/api/referrals/anyposes')
        const collection = new Request(new URL(path, target), options)
        collection.headers.set('origin', target.origin)
        const result = recordReferralResponse(collection, async visit => {
          recorded.push(visit)
          await store.recordVisit(visit)
        })
        pending.push(result)
        return result
      },
    }
    const visitPage = async () => {
      vm.runInNewContext(guard, { document, window, URL, URLSearchParams })
      await Promise.all(pending)
    }
    await visitPage()
    await visitPage()
    assert.equal(recorded.length, 1)
    assert.equal(recorded[0].entryPath, '/app/image/gpt-image-2-5-1k')
    assert.deepEqual(Object.keys(recorded[0]).sort(), ['entryPath', 'visitId', 'visitorId'])
    await store.recordVisit({ ...recorded[0], visitId: randomUUID(), entryPath: '/app/image/gpt-image-2' })
    await createReferralVisitStore(h.db, 'pixal3d').recordVisit({
      ...recorded[0], visitId: randomUUID(), entryPath: '/app/image/gpt-image-2-5-1k',
    })
    // A row from another entry point must not inflate these image landing statistics.
    await store.recordVisit({ ...recorded[0], visitId: randomUUID(), entryPath: '/app/video/minimax-h3' })
    await h.db.prepare('UPDATE referral_visit SET created_at=?').bind(Date.parse('2026-10-19T01:00:00Z')).run()
    const stats = await store.getStats(new Date('2026-10-19T02:00:00Z'))
    assert.deepEqual(stats.totals, { visitors: 1, visits: 2 })
    assert.deepEqual(stats.today, { visitors: 1, visits: 2 })
    assert.deepEqual(stats.last7Days, { visitors: 1, visits: 2 })
    assert.deepEqual(stats.last30Days, { visitors: 1, visits: 2 })
    assert.deepEqual(stats.days.at(-1), { date: '2026-10-19', visitors: 1, visits: 2 })
    assert.deepEqual((await createReferralVisitStore(h.db, 'pixal3d').getStats()).totals, { visitors: 1, visits: 1 })
  } finally { await h.dispose() }
})
