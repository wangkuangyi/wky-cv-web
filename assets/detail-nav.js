(() => {
  const RETURN_KEY = "wky-portfolio-return";
  const RESTORE_KEY = "wky-portfolio-restore";

  const getReferrer = () => {
    if (!document.referrer) return null;
    try {
      const referrer = new URL(document.referrer);
      const sameOrigin = location.protocol === "file:"
        ? referrer.protocol === "file:"
        : referrer.origin === location.origin;
      return sameOrigin ? referrer : null;
    } catch {
      return null;
    }
  };

  const referrerIsPortfolio = referrer => {
    const marker = "/projects/";
    const markerIndex = location.pathname.indexOf(marker);
    if (markerIndex < 0) return false;
    const root = location.pathname.slice(0, markerIndex + 1);
    return referrer.pathname === root || referrer.pathname === `${root}index.html`;
  };

  document.querySelectorAll("[data-smart-back]").forEach(link => {
    link.addEventListener("click", event => {
      const referrer = getReferrer();
      if (!referrer || history.length <= 1) return;
      event.preventDefault();
      if (referrerIsPortfolio(referrer)) {
        try { sessionStorage.setItem(RESTORE_KEY, "1"); } catch { /* storage may be disabled */ }
      }
      history.back();
    });
  });

  document.querySelectorAll("[data-return-portfolio]").forEach(link => {
    link.addEventListener("click", () => {
      try {
        const saved = JSON.parse(sessionStorage.getItem(RETURN_KEY) || "null");
        if (saved && Date.now() - saved.savedAt < 6 * 60 * 60 * 1000) {
          sessionStorage.setItem(RESTORE_KEY, "1");
        }
      } catch { /* use the link's anchor fallback */ }
    });
  });
})();
