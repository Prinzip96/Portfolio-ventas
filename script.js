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

  /* ——— Botón flotante: se oculta en el hero y en el CTA final ——— */
  const talkFloat = document.getElementById("talkFloat");
  const heroEl = document.getElementById("top");
  const contactEl = document.getElementById("contacto");
  if (talkFloat && heroEl) {
    scrollTasks.push(() => {
      const pastHero = heroEl.getBoundingClientRect().bottom < 80;
      const atContact = contactEl
        ? contactEl.getBoundingClientRect().top < window.innerHeight * 0.85
        : false;
      talkFloat.classList.toggle("is-on", pastHero && !atContact);
    });
  }

  /* ——— Flujo de contacto (copiado del portfolio) ——— */
  const chat = document.getElementById("chat");
  if (chat) {
    const MAIL = "jaimesnchz9966@gmail.com";
    const steps = Array.from(chat.querySelectorAll(".chat-q"));
    const picks = Array.from(chat.querySelectorAll(".pick"));
    const count = document.getElementById("chatCount");
    const bar = document.getElementById("chatBar");
    const prev = document.getElementById("chatPrev");
    const sum = document.getElementById("chatSum");
    const form = document.getElementById("chatForm");
    const who = document.getElementById("chatWho");
    const mailIn = document.getElementById("chatMail");
    const more = document.getElementById("chatMore");
    const honey = document.getElementById("chatHoney");
    const sendBtn = document.getElementById("chatSend");
    const statusEl = document.getElementById("chatStatus");
    const sendLabel = sendBtn?.querySelector("[data-label]");
    const answers = {};
    let step = 0;
    let opener = null;
    let sending = false;
    const pad = (n) => String(n).padStart(2, "0");

    const show = (i) => {
      step = Math.min(Math.max(i, 0), steps.length - 1);
      steps.forEach((s, n) => s.classList.toggle("is-on", n === step));
      count.textContent = `${pad(step + 1)} / ${pad(steps.length)}`;
      bar.style.width = `${((step + 1) / steps.length) * 100}%`;
      prev.hidden = step === 0;
      if (step === steps.length - 1) {
        sum.innerHTML = `Quieres <b>${answers[1]}</b>, <b>${answers[2]}</b>, y <b>${answers[3]}</b>.`;
        setTimeout(() => who.focus(), 320);
      }
    };

    const open = (trigger) => {
      opener = trigger || null;
      chat.hidden = false;
      document.body.classList.add("chat-open");
      requestAnimationFrame(() => chat.classList.add("is-open"));
      show(0);
    };

    const close = () => {
      chat.classList.remove("is-open");
      document.body.classList.remove("chat-open");
      setTimeout(() => {
        chat.hidden = true;
        opener?.focus();
      }, 420);
    };

    Array.from(document.querySelectorAll("[data-open-chat]")).forEach((btn) => {
      btn.addEventListener("click", () => open(btn));
    });
    Array.from(chat.querySelectorAll("[data-close-chat]")).forEach((btn) => {
      btn.addEventListener("click", close);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !chat.hidden) close();
    });
    prev.addEventListener("click", () => show(step - 1));

    picks.forEach((pick) => {
      pick.addEventListener("click", () => {
        const group = pick.dataset.group;
        answers[group] = pick.dataset.value;
        picks
          .filter((p) => p.dataset.group === group)
          .forEach((p) => p.classList.toggle("is-on", p === pick));
        setTimeout(() => show(step + 1), reduceMotion ? 0 : 260);
      });
    });

    const setStatus = (text, kind) => {
      if (!statusEl) return;
      statusEl.hidden = !text;
      statusEl.textContent = text || "";
      statusEl.classList.toggle("is-ok", kind === "ok");
      statusEl.classList.toggle("is-err", kind === "err");
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (sending) return;
      if (honey?.value) return;

      const name = who.value.trim();
      const email = mailIn ? mailIn.value.trim() : "";
      const extra = more.value.trim();
      if (!name) { who.focus(); return; }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { mailIn?.focus(); return; }
      if (!answers[1] || !answers[2] || !answers[3]) {
        setStatus("Vuelve atrás y elige las tres opciones.", "err");
        return;
      }

      const message = [
        `Hola Jaime, soy ${name}.`,
        `Mi correo: ${email}`,
        "",
        `Necesito: ${answers[1]}`,
        `Uso: ${answers[2]}`,
        `Plazos: ${answers[3]}`,
        extra ? `\nMás info:\n${extra}` : "",
        "",
        `— Respóndeme a ${email}`,
      ].filter(Boolean).join("\n");

      sending = true;
      sendBtn.disabled = true;
      sendBtn.classList.remove("is-ok");
      if (sendLabel) sendLabel.textContent = "Enviando…";
      setStatus("Enviando…", null);

      try {
        const res = await fetch(`https://formsubmit.co/ajax/${MAIL}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            message,
            _subject: `Estudio Jota — ${name}: ${answers[1]}`,
            _template: "table",
            _captcha: "false",
            _honey: honey?.value || "",
            Necesito: answers[1],
            Uso: answers[2],
            Plazos: answers[3],
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "No se pudo enviar");

        if (sendLabel) sendLabel.textContent = "Enviado";
        sendBtn.classList.add("is-ok");
        setStatus(
          "Listo. Te escribo yo a tu correo. (Si es la primera vez, confirma el aviso que te llega a Gmail.)",
          "ok"
        );
        form.reset();
      } catch (err) {
        if (sendLabel) sendLabel.textContent = "Enviar";
        sendBtn.disabled = false;
        setStatus("No salió por la red. Ábrelo en tu correo y mándalo desde ahí.", "err");
        window.location.href = `mailto:${MAIL}?subject=${encodeURIComponent(
          `Boceto — ${name}`
        )}&body=${encodeURIComponent(message)}`;
      } finally {
        sending = false;
        if (!sendBtn.classList.contains("is-ok")) {
          sendBtn.disabled = false;
          if (sendLabel) sendLabel.textContent = "Enviar";
        }
      }
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
