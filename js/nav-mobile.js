(() => {
  const nav = document.getElementById("nav");
  if (!nav) return;
  const btn = nav.querySelector(".nav-toggle, .sv-nav-toggle");
  const links = nav.querySelector(".nav-links, .sv-links");
  if (!btn || !links) return;

  const setOpen = (open) => {
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  };

  btn.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
  links.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
  addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
})();
