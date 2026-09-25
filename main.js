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

let activeCommunityPlayer = null;

function stopCommunityPlayer() {
  if (!activeCommunityPlayer) return;
  const { button, card, player, media } = activeCommunityPlayer;
  media?.pause?.();
  player.replaceChildren(button);
  card.classList.remove("is-playing");
  activeCommunityPlayer = null;
}

const sceneDialog = document.getElementById("showcase-info");
if (sceneDialog) {
  const title = sceneDialog.querySelector("#showcase-info-title");
  const credit = sceneDialog.querySelector(".showcase-info-credit");
  const promptLabel = sceneDialog.querySelector(".showcase-info-prompt span");
  const promptText = sceneDialog.querySelector(".showcase-info-prompt p");
  const originalLink = sceneDialog.querySelector(".showcase-info-actions a");
  const closeButton = sceneDialog.querySelector(".showcase-info-close");
  const copyButton = sceneDialog.querySelector("[data-copy-scene-prompt]");
  let lastTrigger = null;

  document.querySelectorAll(".community-video-card").forEach((card) => {
    const cardTitle = card.querySelector("h3")?.textContent?.trim();
    const cardCredit = card.querySelector(".community-video-credit");
    const cardOriginal = card.querySelector(".community-video-links a");
    const isOriginal = card.classList.contains("community-video-card--original");
    if (!cardTitle || (!isOriginal && (!cardCredit || !cardOriginal))) return;
    if (isOriginal) return;

    if (cardCredit) cardCredit.textContent = cardCredit.textContent.replace(/ · Seedance 2\.0$/, "");
    if (cardOriginal) card.dataset.originalUrl = cardOriginal.href;
    card.querySelector(".community-video-category")?.remove();
    card.querySelector(".community-video-links")?.remove();
    const playButton = card.querySelector(".community-video-play");
    if (playButton) playButton.setAttribute("aria-label", playButton.getAttribute("aria-label").replace(/ on X$/, ""));

    const infoButton = document.createElement("button");
    infoButton.type = "button";
    infoButton.className = "community-video-info-button";
    infoButton.textContent = "Prompt";
    infoButton.setAttribute("aria-label", `View scene prompt for ${cardTitle}`);
    infoButton.addEventListener("click", () => {
      stopCommunityPlayer();
      lastTrigger = infoButton;
      title.textContent = cardTitle;
      credit.textContent = cardCredit?.textContent ?? "";
      credit.hidden = isOriginal;
      promptLabel.textContent = isOriginal ? "Prompt used for this video" : "Inspired prompt · our interpretation";
      promptText.textContent = card.querySelector(".community-video-prompt")?.textContent?.trim() ?? "";
      originalLink.hidden = isOriginal;
      if (!isOriginal) originalLink.href = card.dataset.originalUrl;
      copyButton.textContent = "Copy prompt";
      sceneDialog.showModal();
      document.body.classList.add("modal-open");
    });
    card.append(infoButton);
  });

  copyButton?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(promptText.textContent);
      copyButton.textContent = "Copied";
    } catch {
      copyButton.textContent = "Copy failed";
    }
  });
  closeButton?.addEventListener("click", () => sceneDialog.close());
  sceneDialog.addEventListener("click", (event) => {
    if (event.target === sceneDialog) sceneDialog.close();
  });
  sceneDialog.addEventListener("close", () => {
    document.body.classList.remove("modal-open");
    lastTrigger?.focus();
    lastTrigger = null;
  });
}

document.querySelectorAll("[data-community-video-id]").forEach((button) => {
  button.querySelector("img")?.addEventListener("error", (event) => {
    event.currentTarget.remove();
  });

  button.addEventListener("click", () => {
    const videoId = button.dataset.communityVideoId;
    const player = button.closest(".community-video-player");
    if (!player || !/^[\w-]{11}$/.test(videoId ?? "")) return;

    stopCommunityPlayer();
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`;
    iframe.title = button.getAttribute("aria-label") ?? "Creator video";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    player.replaceChildren(iframe);
    const card = player.closest(".community-video-card");
    card?.classList.add("is-playing");
    activeCommunityPlayer = { button, card, player, media: iframe };
  });
});

const xVideoSources = {
  "2050805445032337720": "https://video.twimg.com/amplify_video/2050804868496203776/vid/avc1/640x360/Urq2OsiErMhpMBnj.mp4?tag=27",
  "2041561378495082582": "https://video.twimg.com/amplify_video/2041561292805390336/vid/avc1/640x360/69lcPa6ciXKpAd4f.mp4?tag=21",
  "2043209661638414827": "https://video.twimg.com/ext_tw_video/2043209617082343424/pu/vid/avc1/640x360/1bqDKP8ljXb2Uh28.mp4?tag=19",
  "2050664853082456156": "https://video.twimg.com/amplify_video/2050663050433404928/vid/avc1/640x360/pffuSo5HqE0IS7lP.mp4?tag=27",
  "2040376349504815467": "https://video.twimg.com/ext_tw_video/2040376330940821504/pu/vid/avc1/640x360/jftegL5ZUUylxA8Q.mp4?tag=12",
  "2102729372834639960": "https://video.twimg.com/amplify_video/2102729242144292864/vid/avc1/640x360/teVwcZ4-jek5KmUE.mp4?tag=29",
  "2101890198703354285": "https://video.twimg.com/amplify_video/2101890134324965376/vid/avc1/640x360/HQCQWy2gPAqm5bEP.mp4?tag=29",
  "2099966300961554796": "https://video.twimg.com/amplify_video/2099966059625226240/vid/avc1/480x852/hL2g1Aq-eNrbEgQQ.mp4?tag=29",
  "2102952087823044888": "https://video.twimg.com/amplify_video/2102952041752715264/vid/avc1/480x852/uDrWWbvqCvXjFoMe.mp4?tag=29",
  "2100405863123173606": "https://video.twimg.com/amplify_video/2100404208872919040/vid/avc1/640x360/AdEiCfpNUBZIEU7e.mp4?tag=29",
};

document.querySelectorAll("[data-x-post-url]").forEach((button) => {
  button.querySelector("img")?.addEventListener("error", (event) => event.currentTarget.remove());
  button.addEventListener("click", () => {
    const postUrl = button.dataset.xPostUrl ?? "";
    const postId = /^https:\/\/x\.com\/[\w]+\/status\/(\d+)$/.exec(postUrl)?.[1];
    const source = postId && xVideoSources[postId];
    const player = button.closest(".community-video-player");
    if (!source || !player) return;

    stopCommunityPlayer();
    const video = document.createElement("video");
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.poster = button.querySelector("img")?.src ?? "";
    video.src = source;
    video.setAttribute("aria-label", button.getAttribute("aria-label") ?? "Creator video");
    video.addEventListener("error", () => {
      const fallback = document.createElement("a");
      fallback.className = "community-video-error";
      fallback.href = postUrl;
      fallback.target = "_blank";
      fallback.rel = "noopener noreferrer";
      fallback.textContent = "Video unavailable here · Open original post ↗";
      player.replaceChildren(fallback);
      card?.classList.remove("is-playing");
    });
    player.replaceChildren(video);
    const card = player.closest(".community-video-card");
    card?.classList.add("is-playing");
    activeCommunityPlayer = { button, card, player, media: video };
    video.play().catch(() => {
      // Native controls let the visitor start playback if autoplay is blocked.
    });
  });
});

document.querySelectorAll("[data-local-video-src]").forEach((button) => {
  button.addEventListener("click", () => {
    const player = button.closest(".community-video-player");
    const card = player?.closest(".community-video-card");
    if (!player || !card) return;
    stopCommunityPlayer();
    const video = document.createElement("video");
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.poster = button.querySelector("img")?.src ?? "";
    video.src = button.dataset.localVideoSrc;
    video.setAttribute("aria-label", button.getAttribute("aria-label") ?? "Showcase video");
    player.replaceChildren(video);
    card.classList.add("is-playing");
    activeCommunityPlayer = { button, card, player, media: video };
    video.play().catch(() => {
      // Native controls remain available if autoplay is blocked.
    });
  });
});

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
