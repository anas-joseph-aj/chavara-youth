(() => {
  const backToTop = document.createElement("button");
  backToTop.className = "back-to-top";
  backToTop.type = "button";
  backToTop.setAttribute("aria-label", "Back to top");
  backToTop.setAttribute("title", "Back to top");
  backToTop.hidden = true;
  backToTop.innerHTML = '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M12 19V5m-7 7 7-7 7 7" /></svg>';
  document.body.append(backToTop);

  let backToTopVisible = false;
  const syncBackToTop = () => {
    const shouldShow = window.scrollY > 420;
    if (shouldShow === backToTopVisible) return;

    backToTopVisible = shouldShow;
    backToTop.hidden = !shouldShow;
    backToTop.classList.toggle("is-visible", shouldShow);
  };

  window.addEventListener("scroll", syncBackToTop, { passive: true });
  backToTop.addEventListener("click", () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  });

  const revealTargets = document.querySelectorAll(
    "main > section:not(.hero):not(.page-hero):not(.contact-hero):not(.gallery-hero), .member-card, .convener-card, .event-card, .mission-card, .photo-card",
  );

  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries, currentObserver) => {
      document.body.classList.add("luxury-effects-ready");
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          currentObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.08,
      rootMargin: "0px 0px -36px 0px",
    },
  );

  revealTargets.forEach((element, index) => {
    element.classList.add("luxury-reveal");
    if (element.matches(".member-card, .convener-card, .event-card, .mission-card, .photo-card")) {
      element.style.transitionDelay = `${(index % 4) * 70}ms`;
    }
    observer.observe(element);
  });
})();
