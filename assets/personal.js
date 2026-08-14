(() => {
  const gallery = window.PHOTO_GALLERY;
  const win = document.querySelector(".photo-window");
  const track = document.querySelector("[data-gallery-track]");
  const box = document.querySelector(".lightbox");
  const boxImage = box.querySelector(".lightbox-image img");
  const boxTitle = box.querySelector("h3");
  const boxNumber = box.querySelector(".lightbox-number");
  const exifList = box.querySelector(".exif-list");
  const count = document.querySelector("[data-photo-count]");
  const closeButton = box.querySelector(".close");
  let frames = [];
  let activeIndex = 0;

  const metadata = photo => {
    const exif = photo.exif || {};
    return [exif.dateLabel, exif.camera, exif.focalLength, exif.aperture].filter(Boolean);
  };

  const renderGallery = () => {
    if (!gallery || !Array.isArray(gallery.photos)) {
      track.innerHTML = '<p class="gallery-error">照片数据暂时无法读取。</p>';
      return;
    }
    count.textContent = `${gallery.photos.length} PHOTOS`;
    gallery.photos.forEach((photo, index) => {
      const figure = document.createElement("figure");
      figure.className = "photo-frame";
      figure.tabIndex = 0;
      figure.dataset.index = index;
      const meta = metadata(photo);
      figure.innerHTML = `
        <div class="photo-art">
          <img src="${photo.thumb}" alt="${photo.alt}" width="${photo.thumbWidth}" height="${photo.thumbHeight}" ${index === 0 ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async" draggable="false">
          <span class="photo-index">${String(index + 1).padStart(2, "0")} / ${String(gallery.photos.length).padStart(2, "0")}</span>
        </div>
        <figcaption><b>${photo.title}</b><small>${meta.slice(0, 2).join("<br>") || "FUJIFILM X-H2"}</small></figcaption>`;
      track.appendChild(figure);
    });
    frames = [...track.querySelectorAll(".photo-frame")];
  };

  const exifRows = photo => {
    const exif = photo.exif || {};
    return [
      ["CAMERA", exif.camera], ["LENS", exif.lens], ["FOCAL LENGTH", exif.focalLength],
      ["APERTURE", exif.aperture], ["SHUTTER", exif.shutter], ["SENSITIVITY", exif.iso], ["DATE", exif.dateLabel]
    ].filter(([, value]) => value);
  };

  const showPhoto = index => {
    const total = gallery.photos.length;
    activeIndex = (index + total) % total;
    const photo = gallery.photos[activeIndex];
    boxImage.src = photo.src;
    boxImage.alt = photo.alt;
    boxTitle.textContent = photo.title;
    boxNumber.textContent = `${String(activeIndex + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
    exifList.innerHTML = exifRows(photo).map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("");
    box.classList.add("show");
    box.setAttribute("aria-hidden", "false");
    document.body.classList.add("lightbox-open");
    closeButton.focus();
  };

  const close = () => {
    box.classList.remove("show");
    box.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lightbox-open");
    boxImage.removeAttribute("src");
    frames[activeIndex]?.focus({ preventScroll: true });
  };

  renderGallery();

  let down = false, startX = 0, startScroll = 0, targetScroll = 0, moved = false;
  let pressed = null, lastX = 0, lastTime = 0, velocity = 0, paintFrame = 0, momentumFrame = 0;
  let suppressClick = false;
  const clampScroll = value => Math.max(0, Math.min(win.scrollWidth - win.clientWidth, value));
  const stopMotion = () => {
    if (paintFrame) { cancelAnimationFrame(paintFrame); paintFrame = 0; win.scrollLeft = targetScroll; }
    if (momentumFrame) { cancelAnimationFrame(momentumFrame); momentumFrame = 0; }
  };
  const paintScroll = value => {
    targetScroll = clampScroll(value);
    if (paintFrame) return;
    paintFrame = requestAnimationFrame(() => { win.scrollLeft = targetScroll; paintFrame = 0; });
  };
  const snapNearest = () => {
    win.style.scrollSnapType = "x proximity";
    const center = win.scrollLeft + win.clientWidth / 2;
    const nearest = frames.reduce((best, frame) => Math.abs(frame.offsetLeft + frame.offsetWidth / 2 - center) < Math.abs(best.offsetLeft + best.offsetWidth / 2 - center) ? frame : best, frames[0]);
    win.scrollTo({ left: clampScroll(nearest.offsetLeft - (win.clientWidth - nearest.offsetWidth) / 2), behavior: "smooth" });
  };
  const startMomentum = () => {
    if (Math.abs(velocity) < .04) { snapNearest(); return; }
    let position = win.scrollLeft, previous = performance.now();
    const tick = now => {
      const dt = Math.min(32, now - previous); previous = now;
      position = clampScroll(position + velocity * dt); win.scrollLeft = position;
      velocity *= Math.pow(.91, dt / 16);
      const atEdge = position <= 0 || position >= win.scrollWidth - win.clientWidth;
      if (Math.abs(velocity) > .025 && !atEdge) momentumFrame = requestAnimationFrame(tick);
      else { momentumFrame = 0; snapNearest(); }
    };
    momentumFrame = requestAnimationFrame(tick);
  };

  win.addEventListener("pointerdown", event => {
    if (event.pointerType === "touch") return;
    stopMotion(); down = true; moved = false; pressed = event.target.closest(".photo-frame");
    startX = lastX = event.clientX; startScroll = targetScroll = win.scrollLeft; lastTime = performance.now(); velocity = 0;
    win.style.scrollSnapType = "none"; win.style.scrollBehavior = "auto"; win.style.userSelect = "none";
    win.classList.add("dragging"); win.setPointerCapture(event.pointerId);
  });
  win.addEventListener("pointermove", event => {
    if (!down) return;
    const now = performance.now(), distance = event.clientX - startX, dt = Math.max(1, now - lastTime);
    if (Math.abs(distance) > 5) moved = true;
    velocity = velocity * .68 + ((lastX - event.clientX) / dt) * .32;
    lastX = event.clientX; lastTime = now; paintScroll(startScroll - distance);
  });
  win.addEventListener("pointerup", event => {
    if (event.pointerType === "touch" || !down) return;
    down = false; stopMotion(); win.classList.remove("dragging"); win.style.userSelect = "";
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    if (!moved && pressed) {
      win.style.scrollSnapType = "x proximity";
      showPhoto(Number(pressed.dataset.index));
    } else startMomentum();
    pressed = null;
  });
  win.addEventListener("pointercancel", event => {
    if (event.pointerType === "touch") return;
    down = false; pressed = null; stopMotion(); win.classList.remove("dragging"); win.style.userSelect = ""; snapNearest();
  });
  track.addEventListener("click", event => {
    const frame = event.target.closest(".photo-frame");
    if (frame && !suppressClick) showPhoto(Number(frame.dataset.index));
  });
  track.addEventListener("keydown", event => {
    const frame = event.target.closest(".photo-frame");
    if (frame && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); showPhoto(Number(frame.dataset.index)); }
  });
  closeButton.addEventListener("click", close);
  box.querySelector("[data-prev]").addEventListener("click", () => showPhoto(activeIndex - 1));
  box.querySelector("[data-next]").addEventListener("click", () => showPhoto(activeIndex + 1));
  box.addEventListener("click", event => { if (event.target === box) close(); });
  document.addEventListener("keydown", event => {
    if (!box.classList.contains("show")) return;
    if (event.key === "Escape") close();
    if (event.key === "ArrowLeft") showPhoto(activeIndex - 1);
    if (event.key === "ArrowRight") showPhoto(activeIndex + 1);
  });

  const contactModal = document.querySelector(".contact-modal");
  const contactOpen = document.querySelector("[data-contact-open]");
  const contactClose = document.querySelector(".contact-close");
  const setContact = open => {
    contactModal.classList.toggle("show", open);
    contactModal.setAttribute("aria-hidden", String(!open));
    document.body.classList.toggle("contact-open", open);
    if (open) contactClose.focus();
    else contactOpen.focus();
  };
  contactOpen.addEventListener("click", () => setContact(true));
  contactClose.addEventListener("click", () => setContact(false));
  contactModal.addEventListener("click", event => { if (event.target === contactModal) setContact(false); });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && contactModal.classList.contains("show")) setContact(false);
  });
})();
