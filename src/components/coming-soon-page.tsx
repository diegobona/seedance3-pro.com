import { BRAND_MARK } from '../../app/site-brand.mjs'
import { SiteLanguageSwitch } from './site-language-switch'
import { useSiteI18n } from '../lib/site-i18n'
import '../styles/resource-preview.css'

export function ComingSoonPage({ kind, title, description, primaryHref, primaryLabel }: {
  kind: string
  title: string
  description: string
  primaryHref: string
  primaryLabel: string
}) {
  const { t, path } = useSiteI18n()
  return (
    <main className="resource-page">
      <header className="resource-header">
        <a className="resource-brand" href={path("/")}><img src={BRAND_MARK} width="38" height="38" alt="" /><span>{t("SEEDANCE 3.0")}</span></a>
        <SiteLanguageSwitch />
        <nav aria-label={t("Explore published pages")}>
          <a href={path("/")}>{t("Seedance 3.0 ")}<span className="release-badge">{t("Coming Soon")}</span></a>
          <a href={path("/app/video/seedance-2-5")}>{t("Seedance 2.5 Video")}</a>
          <a href={path("/app/image/gpt-image-2-5-1k")}>{t("GPT Image 2.5")}</a>
          <a href={path("/showcase")}>{t("Showcase")}</a>
        </nav>
      </header>

      <section className="resource-hero" aria-labelledby="resource-title">
        <p className="resource-eyebrow">{t(kind)}</p>
        <span className="resource-status">{t("Coming soon")}</span>
        <h1 id="resource-title">{t(title)}</h1>
        <p className="resource-description">{t(description)}</p>
        <p className="resource-note">{t("We are preparing examples and practical guidance for this section. The full guide and case collections are not published yet.")}</p>
        <div className="resource-actions">
          <a className="resource-primary" href={path(primaryHref)}>{t(primaryLabel)} <span aria-hidden="true">↗</span></a>
          <a className="resource-secondary" href={path("/showcase")}>{t("View current examples")}</a>
        </div>
      </section>

      <section className="resource-links" aria-label={t("Available now")}>
        <p>{t("Explore what is available now")}</p>
        <div>
          <a href={path("/app/video/seedance-2-5")}>{t("Seedance 2.5 video generator")}</a>
          <a href={path("/app/image/gpt-image-2-5-1k")}>{t("GPT Image 2.5")}</a>
          <a href={path("/pose-to-image")}>{t("Pose Control")}</a>
          <a href={path("/blog")}>{t("Blog")}</a>
        </div>
      </section>
    </main>
  )
}
