const menuButton = document.querySelector(".menu-button");
const mobileNavigation = document.getElementById("mobile-navigation");

if (menuButton && mobileNavigation) {
  menuButton.addEventListener("click", () => {
    const isOpen = mobileNavigation.classList.toggle("is-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  });

  mobileNavigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileNavigation.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Open navigation");
    });
  });
}

const showcaseCards = document.querySelectorAll(".showcase-preview-button");
const videoDialog = document.getElementById("showcase-player");
const dialogPlayer = videoDialog?.querySelector(".video-dialog-player");
const dialogCloseButton = videoDialog?.querySelector(".video-dialog-close");

if (showcaseCards.length && videoDialog && dialogPlayer && dialogCloseButton) {
  let activeShowcaseCard = null;

  showcaseCards.forEach((card) => {
    card.addEventListener("click", () => {
      const source = card.dataset.videoSrc;
      if (!source) return;

      activeShowcaseCard = card;
      dialogPlayer.src = source;
      videoDialog.showModal();
      document.body.classList.add("modal-open");
      dialogPlayer.play().catch(() => {
        // Native controls remain available if autoplay is blocked.
      });
    });
  });

  dialogCloseButton.addEventListener("click", () => videoDialog.close());

  videoDialog.addEventListener("click", (event) => {
    if (event.target === videoDialog) videoDialog.close();
  });

  videoDialog.addEventListener("close", () => {
    dialogPlayer.pause();
    dialogPlayer.removeAttribute("src");
    dialogPlayer.load();
    document.body.classList.remove("modal-open");
    activeShowcaseCard?.focus();
    activeShowcaseCard = null;
  });
}
