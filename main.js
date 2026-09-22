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

const poseDemo = document.querySelector("[data-pose-demo]");

if (poseDemo) {
  const poseDemoStage = poseDemo.closest(".pose-demo-stage");
  const poseDemoPlay = poseDemoStage?.querySelector("[data-pose-demo-play]");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const savesData = navigator.connection?.saveData === true;

  poseDemo.addEventListener("timeupdate", () => {
    if (poseDemo.currentTime > 0.15) poseDemoStage?.classList.add("is-playing");
  });

  poseDemoPlay?.addEventListener("click", () => {
    poseDemo.play().catch(() => {
      // Keep the poster visible if playback is unavailable.
    });
  });

  if (prefersReducedMotion || savesData) {
    poseDemo.removeAttribute("autoplay");
    poseDemo.pause();
  } else if ("IntersectionObserver" in window) {
    const poseDemoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          poseDemo.play().catch(() => {
            // The poster remains visible when autoplay is unavailable.
          });
        } else {
          poseDemo.pause();
        }
      });
    }, { threshold: 0.2 });

    poseDemoObserver.observe(poseDemo);
  }
}
