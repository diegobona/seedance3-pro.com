import { useRouterState } from '@tanstack/react-router'
import { languageSwitchPath } from '../../app/site-locale.mjs'
import { useSiteI18n } from '../lib/site-i18n'

export function SiteLanguageSwitch() {
  const { locale } = useSiteI18n()
  const currentPath = useRouterState({ select: state => state.location.href })
  return <nav className="site-language-switch" data-site-language-switch aria-label={locale === 'zh' ? '网站语言' : 'Site language'}>
    <a href={languageSwitchPath(currentPath, 'zh')} data-language="zh" lang="zh-Hans" aria-current={locale === 'zh' ? 'true' : undefined}>中文</a>
    <span aria-hidden="true"> | </span>
    <a href={languageSwitchPath(currentPath, 'en')} data-language="en" lang="en" aria-current={locale === 'en' ? 'true' : undefined}>EN</a>
  </nav>
}
