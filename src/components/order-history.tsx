import type { RefundRequestView } from '../db/refund-requests'
import { RefundStatus } from './refund-request-ui'
export interface PurchaseOrder {
  id: string
  sessionId: string | null
  createdAt: string
  status: 'pending' | 'paid' | 'reversed'
  amount: number
  currency: string
  credits: number
  revokedCredits: number
  refundRequest?: RefundRequestView | null
}

export function OrderHistory({ locale, signedIn, orders, error, hasMore, loadingMore, onRefresh, onLoadMore, onLogin, onRequestRefund }: {
  locale: string; signedIn: boolean; orders: PurchaseOrder[] | null; error: string
  hasMore: boolean; loadingMore: boolean; onRefresh: () => void; onLoadMore: () => void; onLogin: () => void
  onRequestRefund?: (order:PurchaseOrder)=>void
}) {
  const text = (en: string, zh: string) => locale === 'zh' ? zh : en
  const status = (value: PurchaseOrder['status']) => value === 'paid' ? text('Paid', '已支付')
    : value === 'reversed' ? text('Refunded / reversed', '已退款 / 撤销') : text('Not completed', '未完成支付')
  return <section className="billing-orders" id="orders" aria-labelledby="order-history-title">
    <div className="billing-orders-heading"><div><p className="billing-eyebrow">{text('YOUR PURCHASES', '购买明细')}</p>
      <h2 id="order-history-title">{text('Order history', '订单记录')}</h2></div>
      {signedIn && <button className="billing-refresh" type="button" onClick={onRefresh}>{text('Refresh', '刷新')}</button>}
    </div>
    {!signedIn ? <div className="billing-orders-empty"><p>{text('Log in to view your orders, payments and refunds.', '登录后查看你的订单、付款与退款记录。')}</p><button type="button" onClick={onLogin}>{text('Log in', '登录')}</button></div>
      : <>
        {error && <p className="billing-orders-error" role="alert">{error}</p>}
        {!orders ? !error && <p role="status">{text('Loading your orders…', '正在加载订单…')}</p>
          : !orders.length ? <div className="billing-orders-empty"><strong>{text('No orders yet', '暂无订单')}</strong><p>{text('Your purchases will appear here after you open checkout.', '购买订单会显示在这里，方便随时查看。')}</p></div>
          : <div className="billing-orders-list"><table><thead><tr>
            <th>{text('Order / created', '订单 / 下单时间')}</th><th>{text('Amount', '金额')}</th><th>{text('Credits', '积分')}</th><th>{text('Status', '状态')}</th>
          </tr></thead><tbody>{orders.map(order => <tr key={order.id}>
            <td className="billing-order-identity"><strong>{text('Credit pack', '积分包')}</strong><time dateTime={order.createdAt}>{new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(order.createdAt))}</time><code title={text('Order number', '订单编号')}>{order.id}</code></td>
            <td data-label={text('Amount', '金额')} className="billing-order-amount">{new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', { style: 'currency', currency: order.currency }).format(order.amount / 100)}</td>
            <td data-label={text('Credits', '积分')}><span>{order.credits} {text('credits', '积分')}</span><small className="billing-order-credit-state">{order.status === 'paid' ? text('Added to your balance', '已到账') : order.status === 'pending' ? text('Not added yet', '尚未到账') : text(`${order.revokedCredits} credits revoked`, `已扣回 ${order.revokedCredits} 积分`)}</small></td>
            <td data-label={text('Status', '状态')}>{(!order.refundRequest||order.status!=='reversed')&&<span className={`billing-order-state is-${order.status}`}>{status(order.status)}</span>}
              {order.refundRequest?<RefundStatus request={order.refundRequest} locale={locale} currency={order.currency}/>:order.status==='paid'&&onRequestRefund&&<button type="button" className="refund-request-button" onClick={()=>onRequestRefund(order)}>{text('Request refund','申请退款')}</button>}
            </td>
          </tr>)}</tbody></table></div>}
        {hasMore && <button className="billing-load-more" type="button" disabled={loadingMore} onClick={onLoadMore}>{loadingMore ? text('Loading…', '加载中…') : text('Load more orders', '加载更多订单')}</button>}
      </>}
  </section>
}
