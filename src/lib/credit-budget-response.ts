/** Only expose known, actionable accounting errors; SQL/provider details stay private. */
export function creditBudgetErrorResponse(error: unknown): Response | null {
  const code = (error as { code?: unknown } | null)?.code
  if (code === 'NETWORK_FREE_BUDGET_EXCEEDED') {
    return Response.json({
      success: false, code,
      message: 'This network’s daily free allowance is used up. It resets at 00:00 Asia/Shanghai. You can choose to use purchased credits.',
    }, { status: 402, headers: { 'cache-control': 'no-store' } })
  }
  if (code === 'FREE_BUDGET_EXCEEDED') {
    return Response.json({
      success: false, code,
      message: 'Today’s free generation budget is used up. Wait for the next daily reset or choose to use purchased credits.',
    }, { status: 402, headers: { 'cache-control': 'no-store' } })
  }
  if (code === 'BILLING_HOLD') {
    return Response.json({
      success: false, code,
      message: 'Your account requires a payment review. Please contact support.',
    }, { status: 403, headers: { 'cache-control': 'no-store' } })
  }
  if (code === 'CREDIT_BACKEND_UNSUPPORTED') {
    return Response.json({
      success: false, code: 'GENERATION_UNAVAILABLE',
      message: 'Generation is temporarily unavailable. Please try again later.',
    }, { status: 503, headers: { 'cache-control': 'no-store' } })
  }
  return null
}
