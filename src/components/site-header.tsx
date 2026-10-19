import { useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { PUBLIC_NAVIGATION } from '../../app/site-navigation.mjs'
import { stripLocalePath } from '../../app/site-locale.mjs'
import { useSiteI18n } from '../lib/site-i18n'
import { SiteLanguageSwitch } from './site-language-switch'
import '../../assets/site-navigation.css'

export function SiteHeader() {
  const { locale, path } = useSiteI18n()
  const pathname = useRouterState({ select: state => state.location.pathname })
  const [menuOpen, setMenuOpen] = useState(false)
  const links = PUBLIC_NAVIGATION.map((item, index) => <a key={item.href} className={index > 1 ? 'home-extra-nav' : undefined} href={path(item.href)} aria-current={stripLocalePath(pathname) === item.href ? 'page' : undefined}>{locale === 'zh' ? item.zh : item.en}</a>)
  return <header className="site-header" data-site-header>
    <div className="container inner">
      <a className="brand" href={path('/')} aria-label={locale === 'zh' ? 'SEEDANCE 3.0 首页' : 'SEEDANCE 3.0 home'}><img className="brand-mark" src="/assets/seedance-mark.svg" width="40" height="40" alt="" /><span>SEEDANCE 3.0</span></a>
      <nav className="desktop-nav compact-nav" aria-label={locale === 'zh' ? '主导航' : 'Primary navigation'}>{links}</nav>
      <div className="header-actions"><SiteLanguageSwitch /><a className="button small" href={path('/') + '#create'}>{locale === 'zh' ? '免费试用' : 'Try for free'}</a><button className="menu-button" type="button" aria-label={locale === 'zh' ? '打开导航' : 'Open navigation'} aria-controls="mobile-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>☰</button></div>
    </div>
    <nav className={'mobile-nav' + (menuOpen ? ' is-open' : '')} id="mobile-navigation" aria-label={locale === 'zh' ? '移动端导航' : 'Mobile navigation'}>{links}</nav>
  </header>
}
