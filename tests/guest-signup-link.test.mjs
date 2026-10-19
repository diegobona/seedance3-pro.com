import assert from 'node:assert/strict';
import test from 'node:test';

function noticeElement() {
  const ownerDocument = { createElement(tagName) {
    return { tagName, attributes: {}, setAttribute(name, value) { this.attributes[name] = value; },
      addEventListener(_type, callback) { this.click = callback; } };
  } };
  return { ownerDocument, replaceChildren(...children) { this.children = children; } };
}

test('exhausted image and video notices link directly to registration in both languages', async () => {
  const { renderGuestTrialNotice } = await import('../app/guest-trial-notice.mjs');
  for (const kind of ['image', 'video']) for (const locale of ['en', 'zh']) {
    const element = noticeElement();
    let opened = 0, prevented = false;
    renderGuestTrialNotice(element, kind, { locale,
      href: `https://seedance3-pro.com/${locale === 'zh' ? 'zh/' : ''}app/video/minimax-h3?reference=preserved`,
      onSignup: () => { opened++; },
    });
    const link = element.children.find(child => child?.tagName === 'a');
    assert.equal(link.textContent, locale === 'zh' ? '注册' : 'Sign up');
    const destination = new URL(link.attributes.href, 'https://seedance3-pro.com');
    assert.equal(destination.searchParams.get('auth'), 'register');
    assert.equal(destination.searchParams.get('reference'), 'preserved');
    assert.equal(destination.pathname.startsWith('/zh/'), locale === 'zh');
    link.click({ button: 0, preventDefault() { prevented = true; } });
    assert.equal(opened, 1);
    assert.equal(prevented, true);
    link.click({ button: 0, ctrlKey: true, preventDefault() { throw new Error('keep native new-tab navigation'); } });
    assert.equal(opened, 1);
    const text = element.children.map(child => typeof child === 'string' ? child : child.textContent).join('');
    assert.match(text, locale === 'zh' ? /额度已用完/ : /used up/);
  }
});
