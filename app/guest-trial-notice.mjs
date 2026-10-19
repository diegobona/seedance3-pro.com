import { t, currentLocale } from './i18n.mjs';

export function renderGuestTrialNotice(element, kind, { href, onSignup, locale = currentLocale() }) {
  const message = t(kind === 'image'
    ? 'Your free images are used up. Sign up for daily free credits.'
    : 'Your free video seconds are used up. Sign up for daily free credits.', {}, locale);
  const label = t('Sign up', {}, locale);
  const index = message.indexOf(label);
  const link = element.ownerDocument.createElement('a');
  const destination = new URL(href);
  destination.searchParams.set('auth', 'register');
  link.setAttribute('href', destination.pathname + destination.search + destination.hash);
  link.className = 'guest-signup-link';
  link.textContent = label;
  link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.defaultPrevented) return;
    event.preventDefault();
    onSignup();
  });
  element.replaceChildren(message.slice(0, index), link, message.slice(index + label.length));
}
