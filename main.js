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
