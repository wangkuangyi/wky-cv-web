(() => {
  const timeline = document.querySelector("[data-timeline]");
  const progress = document.querySelector("[data-progress]");
  const continuity = document.querySelector("[data-continuity]");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  const updateProgress = () => {
    if (!timeline || !progress) return;
    const rect = timeline.getBoundingClientRect();
    const start = innerHeight * .55;
    const distance = Math.max(1, rect.height - innerHeight * .35);
    const value = Math.min(1, Math.max(0, (start - rect.top) / distance));
    timeline.style.setProperty("--progress", `${(value * 100).toFixed(2)}%`);
  };

  const updateContinuity = () => {
    if (!timeline || !continuity) return;
    const moments = timeline.querySelectorAll('[data-project="text2sql"]');
    if (moments.length !== 2) return;
    const timelineRect = timeline.getBoundingClientRect();
    const firstRect = moments[0].querySelector(".node").getBoundingClientRect();
    const secondRect = moments[1].querySelector(".node").getBoundingClientRect();
    const start = firstRect.top - timelineRect.top + firstRect.height / 2;
    const end = secondRect.top - timelineRect.top + secondRect.height / 2;
    timeline.style.setProperty("--continuity-top", `${start}px`);
    timeline.style.setProperty("--continuity-height", `${Math.max(0, end - start)}px`);
  };

  let ticking = false;
  const requestProgress = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateProgress();
      updateContinuity();
      ticking = false;
    });
  };

  if (reducedMotion.matches) {
    document.querySelectorAll(".reveal").forEach(item => item.classList.add("on"));
  } else {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("on");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .13 });
    document.querySelectorAll(".reveal").forEach(item => observer.observe(item));
  }

  addEventListener("scroll", requestProgress, { passive: true });
  addEventListener("resize", requestProgress);
  addEventListener("pageshow", requestProgress);
  updateProgress();
  updateContinuity();
})();
