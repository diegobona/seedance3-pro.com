import { renderPurchaseAssurance, renderTrustFooter } from '../../app/site-trust.mjs'
import { useSiteI18n } from '../lib/site-i18n'
import { useId } from 'react'
import '../../assets/site-trust.css'

export function SiteTrustFooter() {
  const { locale } = useSiteI18n()
  const popupId = 'footer-contact-' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return <footer className="trust-shell" dangerouslySetInnerHTML={{ __html: renderTrustFooter(locale, { popupId }) }} />
}

export function PurchaseAssurance() {
  const { locale } = useSiteI18n()
  const popupId = 'support-email-' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return <div dangerouslySetInnerHTML={{ __html: renderPurchaseAssurance(locale, popupId) }} />
}
