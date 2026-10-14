(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ——— Scroll único ——— */
  const scrollTasks = [];
  let scrollQueued = false;

  const onScrollFrame = () => {
    scrollQueued = false;
    scrollTasks.forEach((fn) => fn());
  };

  window.addEventListener(
    "scroll",
    () => {
      if (scrollQueued) return;
      scrollQueued = true;
      requestAnimationFrame(onScrollFrame);
    },
    { passive: true }
  );

  window.addEventListener("resize", onScrollFrame, { passive: true });

  /* ——— Nav + barra de progreso ——— */
  const nav = document.getElementById("nav");
  const progress = document.getElementById("progress");

  scrollTasks.push(() => {
    const y = window.scrollY;
    nav?.classList.toggle("is-stuck", y > 40);

    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    }
  });

  document.getElementById("scrollBtn")?.addEventListener("click", () => {
    document.getElementById("trabajos")?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  });

  /* ——— Correo flotante: se oculta en el hero y en el CTA final ——— */
  const mailFloat = document.getElementById("mailFloat");
  const heroEl = document.getElementById("top");
  const contactEl = document.getElementById("contacto");
  if (mailFloat && heroEl) {
    scrollTasks.push(() => {
      const pastHero = heroEl.getBoundingClientRect().bottom < 80;
      const atContact = contactEl
        ? contactEl.getBoundingClientRect().top < window.innerHeight * 0.85
        : false;
      mailFloat.classList.toggle("is-on", pastHero && !atContact);
    });
  }

  /* ——— Reveals al entrar en viewport ——— */
  const reveals = Array.from(document.querySelectorAll(".reveal"));
  if (reveals.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      reveals.forEach((el) => el.classList.add("is-in"));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
      );
      reveals.forEach((el) => io.observe(el));
    }
  }

  /* ——— FAQ acordeón ——— */
  Array.from(document.querySelectorAll(".acc-list")).forEach((list) => {
    const items = Array.from(list.querySelectorAll(".acc"));

    items.forEach((item) => {
      const head = item.querySelector(".acc-head");
      const panel = item.querySelector(".acc-panel");
      const inner = item.querySelector(".acc-inner");
      if (!head || !panel || !inner) return;

      const close = () => {
        item.classList.remove("is-open");
        head.setAttribute("aria-expanded", "false");
        panel.style.height = "0px";
      };

      const open = () => {
        item.classList.add("is-open");
        head.setAttribute("aria-expanded", "true");
        panel.style.height = `${inner.scrollHeight}px`;
      };

      head.addEventListener("click", () => {
        const isOpen = item.classList.contains("is-open");
        items.forEach((other) => {
          if (other === item) return;
          other.classList.remove("is-open");
          other.querySelector(".acc-head")?.setAttribute("aria-expanded", "false");
          const p = other.querySelector(".acc-panel");
          if (p) p.style.height = "0px";
        });
        isOpen ? close() : open();
      });

      window.addEventListener(
        "resize",
        () => {
          if (item.classList.contains("is-open")) {
            panel.style.height = `${inner.scrollHeight}px`;
          }
        },
        { passive: true }
      );
    });
  });
})();
