// The loopback-only CMS reads the private statistics service on the user's behalf.
export async function readReferralStatsForLocalAdmin({ getSecret, fetchImpl = fetch }) {
  const token = await getSecret('ANALYTICS_ADMIN_TOKEN');
  if (!token) return { status: 503, body: { success: false, message: '统计服务暂不可用。' } };
  try {
    const response = await fetchImpl('https://seedance3-pro.com/api/admin/referrals/anyposes', {
      headers: { 'x-analytics-token': token },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return { status: 503, body: { success: false, message: '统计服务暂不可用，请稍后重试。' } };
    const body = await response.json();
    if (body.success !== true || body.source !== 'anyposes') throw new Error('Invalid statistics response');
    return { status: 200, body };
  } catch {
    return { status: 503, body: { success: false, message: '无法读取统计，请稍后重试。' } };
  }
}
