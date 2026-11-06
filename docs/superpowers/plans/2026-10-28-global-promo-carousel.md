# Global Promo Carousel Implementation Plan

**Goal:** Add a compact rotating promotional banner above navigation on static and React pages in English and Chinese.

**Architecture:** Shared server-rendered markup, browser lifecycle controller, and scoped CSS. Static navigation synchronization injects the banner; the React root mounts the same markup and controller. Maintain the latest deployed public files when staging, then deploy Pages and Worker.

**Tech Stack:** JavaScript modules, React, CSS, Node tests, Tabbit browser, Cloudflare Pages/Workers.

- [x] Add meaningful tests for bilingual copy, direct video destinations, single global injection and idempotent synchronization.
- [x] Implement shared rendering and accessible carousel with automatic/manual switching, pause on hover/focus/reduced motion, and dismiss.
- [x] Integrate static public pages and React root; offset sticky navigation/sidebar/output panels without covering content.
- [x] Check desktop/mobile EN/ZH, full page and client navigation, carousel actions, keyboard, dismiss and links.
- [x] Run build/typecheck and targeted tests; stage audited public artifacts; deploy and verify production.
