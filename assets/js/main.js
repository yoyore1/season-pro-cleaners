(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const y = $("[data-year]"); if (y) y.textContent = new Date().getFullYear();

  /* ---------- safety: never let the hero content stay hidden if the intro animation is blocked ---------- */
  const heroContent = $("[data-hero-content]");
  if (heroContent) setTimeout(() => { heroContent.style.opacity = "1"; heroContent.style.transform = "none"; }, reduce ? 0 : 2400);

  /* ---------- header + dock on scroll ---------- */
  const header = $("[data-header]"), dock = $("[data-dock]");
  const onScroll = () => {
    const s = window.scrollY;
    if (header) header.style.boxShadow = s > 24 ? "0 8px 30px -18px rgba(8,40,70,.55)" : "none";
    if (dock) dock.classList.toggle("is-visible", s > 600);
    // parallax
    if (!reduce) $$("[data-parallax]").forEach((el) => { el.style.transform = `translate3d(0, ${s * 0.18}px, 0)`; });
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- mobile drawer ---------- */
  const burger = $("[data-nav-toggle]"), drawer = $("[data-nav-drawer]");
  if (burger && drawer) {
    const set = (o) => { burger.setAttribute("aria-expanded", String(o)); drawer.hidden = !o; };
    burger.addEventListener("click", () => set(burger.getAttribute("aria-expanded") !== "true"));
    drawer.addEventListener("click", (e) => { if (e.target.closest("a")) set(false); });
  }

  /* ---------- scroll reveals ---------- */
  const reveals = $$("[data-reveal]");
  if (!reduce && "IntersectionObserver" in window) {
    reveals.forEach((el, i) => { el.style.transitionDelay = `${(i % 3) * 80}ms`; });
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: "0px 0px -40px" });
    reveals.forEach((el) => io.observe(el));
  } else reveals.forEach((el) => el.classList.add("is-in"));

  /* ---------- count-up ---------- */
  const counts = $$("[data-count]");
  if (!reduce && "IntersectionObserver" in window && counts.length) {
    const cio = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      const el = e.target, target = Number(el.dataset.count), suf = el.dataset.suffix || "";
      const dur = 1100, t0 = performance.now();
      const tick = (now) => {
        const p = Math.min((now - t0) / dur, 1), ease = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * ease) + suf;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }), { threshold: 0.6 });
    counts.forEach((el) => cio.observe(el));
  }

  /* ---------- before / after slider ---------- */
  const ba = $("[data-ba]");
  if (ba) {
    const stage = $(".ba__stage", ba), range = $("[data-ba-range]", ba);
    const setPos = (pct) => { pct = Math.max(0, Math.min(100, pct)); ba.style.setProperty("--pos", pct + "%"); if (range) range.value = String(pct); };
    setPos(50);
    let drag = false;
    const fromEvt = (e) => { const r = stage.getBoundingClientRect(); const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left; setPos((x / r.width) * 100); };
    stage.addEventListener("pointerdown", (e) => { e.preventDefault(); drag = true; stage.setPointerCapture?.(e.pointerId); fromEvt(e); });
    stage.addEventListener("pointermove", (e) => { if (drag) fromEvt(e); });
    addEventListener("pointerup", () => { drag = false; });
    if (range) range.addEventListener("input", () => setPos(Number(range.value)));
    if (!reduce && "IntersectionObserver" in window) {
      let nudged = false;
      const nio = new IntersectionObserver((es) => es.forEach((e) => {
        if (!e.isIntersecting || nudged) return; nudged = true; nio.disconnect();
        const t0 = performance.now();
        const tick = (now) => { const t = Math.min((now - t0) / 1300, 1); setPos(50 + Math.sin(t * Math.PI) * 18); if (t < 1) requestAnimationFrame(tick); else setPos(50); };
        requestAnimationFrame(tick);
      }), { threshold: 0.5 });
      nio.observe(ba);
    }
  }

  /* ---------- lead form ---------- */
  const form = $("[data-form]");
  if (form) {
    const status = $("[data-form-status]", form), LOAD = Date.now(), dflt = status ? status.textContent : "";
    const fail = (m) => { if (status) { status.textContent = m; status.className = "quote__fine is-err"; } };
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      if ((data.name || "").trim().length < 2) return fail("Please enter your name.");
      if ((data.phone || "").replace(/\D/g, "").length < 7) return fail("Please enter a valid phone number.");
      if (status) { status.textContent = "Sending…"; status.className = "quote__fine"; }
      try {
        const res = await fetch("/api/estimate", { method: "POST", headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" }, body: JSON.stringify({ ...data, _ts: LOAD }) });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.ok) { form.reset(); if (status) { status.textContent = "✅ Got it! Season Pro will reach out shortly with your free quote."; status.className = "quote__fine is-ok"; } }
        else fail(json.error || "Something went wrong. Please call (647) 818-5524.");
      } catch { form.reset(); if (status) { status.textContent = "✅ Thanks! Please call (647) 818-5524 to confirm."; status.className = "quote__fine is-ok"; } }
    });
    form.addEventListener("input", () => { if (status && status.classList.contains("is-err")) { status.textContent = dflt; status.className = "quote__fine"; } });
  }
})();
