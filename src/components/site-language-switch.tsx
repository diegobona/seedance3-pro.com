import { useRouterState } from '@tanstack/react-router'
import { languageSwitchPath } from '../../app/site-locale.mjs'
import { useSiteI18n } from '../lib/site-i18n'

export function SiteLanguageSwitch() {
  const { locale } = useSiteI18n()
  const currentPath = useRouterState({ select: state => state.location.href })
  return <nav className="site-language-switch" data-site-language-switch data-language-dropdown aria-label={locale === 'zh' ? '网站语言' : 'Site language'}>
    <details className="site-language-dropdown">
      <summary aria-label={locale === 'zh' ? '切换语言，中文' : 'Change language, English'}><span data-language-label>{locale === 'zh' ? '中文' : 'EN'}</span></summary>
      <div className="site-language-options">
        <a href={languageSwitchPath(currentPath, 'zh')} data-language="zh" lang="zh-Hans" aria-current={locale === 'zh' ? 'true' : undefined}>中文</a>
        <a href={languageSwitchPath(currentPath, 'en')} data-language="en" lang="en" aria-current={locale === 'en' ? 'true' : undefined}>English</a>
      </div>
    </details>
  </nav>
}
