(function () {
  if (!document.body.classList.contains("adkin-demo")) return;

  initThemeClass();
  enhanceRoomCards();
  applySectionSpacing();
  enhanceTypography();
  initScrollReveal();
  initHeroReveal();
  initAdkinBrand();
  enhanceBentoCards();
  enhanceBlockquotes();
  initBookingForms();
  initMotionLayer();

  function initMotionLayer() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    initHeroAmbience();
    initGradientText();
    initCtaShine();
    initFloatingWidgets();
    initEyebrows();
    initHeadingAccents();
    initStaggerGrids();
  }

  function initHeroAmbience() {
    document.querySelectorAll("main > section:first-child").forEach(function (section) {
      if (section.querySelector("img, .adkin-hero-classic")) {
        section.classList.add("adkin-hero-ambience");
      }
    });

    document.querySelectorAll("body.adkin-demo > section").forEach(function (section) {
      if (section.querySelector(".adkin-hero-premium, .adkin-glass-nav")) {
        section.classList.add("adkin-hero-ambience");
      }
    });
  }

  function initGradientText() {
    document.querySelectorAll("h1 span.bg-clip-text, h1 span[class*='bg-gradient'], .bg-clip-text.text-transparent").forEach(function (el) {
      el.classList.add("adkin-anim-gradient");
    });
  }

  function initCtaShine() {
    document.querySelectorAll(".adkin-hero-classic a, .adkin-hero-premium a").forEach(function (link, index) {
      if (index === 0 || /reserv/i.test(link.textContent || "")) {
        link.classList.add("adkin-cta-shine");
      }
    });

    document.querySelectorAll("#reservas button, .adkin-booking-glass__submit").forEach(function (btn) {
      btn.classList.add("adkin-cta-shine");
    });
  }

  function initFloatingWidgets() {
    document.querySelectorAll("#reserva-widget > div, #reservas > div").forEach(function (widget) {
      widget.classList.add("adkin-float-widget");
    });

    var reservaSection = document.getElementById("reserva-widget");
    if (!reservaSection || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    reservaSection.classList.add("adkin-reveal", "adkin-reveal--scale");

    var reservaObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            reservaObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.25 }
    );

    reservaObserver.observe(reservaSection);
  }

  function initEyebrows() {
    document.querySelectorAll("p.text-xs.uppercase, span.text-xs.uppercase, .adkin-booking-glass__eyebrow").forEach(function (el) {
      if (el.closest(".adkin-demo-switcher, .wa-floating, .adkin-brand-footer")) return;
      el.classList.add("adkin-eyebrow-live");
    });
  }

  function initHeadingAccents() {
    document.querySelectorAll(".adkin-heading-luxe, section[id] > h2, section[id] > h3.font-display").forEach(function (heading) {
      if (heading.closest(".adkin-booking-glass, .adkin-brand-footer, .adkin-bento")) return;
      heading.classList.add("adkin-heading-accent");

      var accentObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-accent-visible");
              accentObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.6 }
      );

      accentObserver.observe(heading);
    });
  }

  function initStaggerGrids() {
    var grids = document.querySelectorAll(
      "#habitaciones .grid, section[id='testimonios'] .grid, .adkin-bento"
    );

    grids.forEach(function (grid) {
      var items = grid.children;
      Array.prototype.forEach.call(items, function (item, index) {
        item.classList.add("adkin-reveal", "adkin-reveal--scale");
        if (index > 0) item.classList.add("adkin-reveal--d" + Math.min(index, 6));
      });
    });

    var gridObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            gridObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -4% 0px" }
    );

    document.querySelectorAll("#habitaciones .grid > *, section[id='testimonios'] .grid > *, .adkin-bento > *").forEach(function (item) {
      gridObserver.observe(item);
    });
  }

  function enhanceBentoCards() {
    document.querySelectorAll(".adkin-bento article:not(.group)").forEach(function (card) {
      card.classList.add("adkin-copy-fit", "adkin-bento__text");
      var title = card.querySelector("h3");
      if (title) title.classList.add("adkin-text-balanced");
    });
  }

  function enhanceBlockquotes() {
    document.querySelectorAll("section[id='testimonios'] blockquote, #testimonios blockquote").forEach(function (quote) {
      quote.classList.add("adkin-copy-fit");
    });
  }

  function initBookingForms() {
    document.querySelectorAll(".adkin-booking-glass").forEach(function (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var btn = form.querySelector(".adkin-booking-glass__submit");
        if (!btn) return;

        var original = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Consultando...";

        window.setTimeout(function () {
          btn.textContent = "Disponible — demo";
          window.setTimeout(function () {
            btn.textContent = original;
            btn.disabled = false;
          }, 1800);
        }, 700);
      });
    });
  }

  function initThemeClass() {
    var light = document.body.classList.contains("bg-family-cream") ||
      document.body.classList.contains("bg-corp-light") ||
      document.body.classList.contains("bg-eco-sand") ||
      document.body.classList.contains("bg-white");

    if (light) {
      document.body.classList.add("adkin-theme-light");
    } else {
      document.body.classList.add("adkin-theme-dark");
    }
  }

  function enhanceRoomCards() {
    var selectors = [
      "#habitaciones article",
      "#habitaciones .grid > article",
      "section[id='habitaciones'] article"
    ];

    document.querySelectorAll(selectors.join(",")).forEach(function (card) {
      card.classList.add("adkin-room-card", "adkin-copy-fit");

      var img = card.querySelector(":scope > img");
      if (img && !img.closest(".adkin-img-zoom")) {
        var wrap = document.createElement("div");
        wrap.className = "adkin-img-zoom";
        var heightClass = img.className.match(/\bh-[\w\[\]./%-]+/);
        if (heightClass) {
          wrap.className += " " + heightClass[0];
        } else {
          wrap.className += " h-56";
        }
        img.parentNode.insertBefore(wrap, img);
        wrap.appendChild(img);
      }
    });
  }

  function applySectionSpacing() {
    var sections = document.querySelectorAll("main > section, body.adkin-demo > section[id]");

    sections.forEach(function (section) {
      if (section.id === "reserva-widget") return;
      if (section.querySelector(".adkin-hero-classic")) return;
      if (section.className.indexOf("min-h-") !== -1 && section.querySelector(".adkin-glass-nav, .adkin-hero-premium")) {
        return;
      }
      section.classList.add("adkin-section-luxe");
    });
  }

  function enhanceTypography() {
    document.querySelectorAll("main h2, section[id] > h2, section[id] > h3.font-display").forEach(function (heading) {
      if (heading.closest(".adkin-brand-footer, .adkin-booking-glass, .adkin-bento")) return;
      heading.classList.add("adkin-heading-luxe");
    });

    document.querySelectorAll("main section p, section[id] > p, section[id] .grid > article p").forEach(function (paragraph) {
      if (paragraph.closest(".adkin-brand-footer, .wa-floating, .adkin-demo-switcher, form, address, blockquote, .adkin-booking-glass, .adkin-hero-classic")) return;
      if (paragraph.className.indexOf("text-xs") !== -1 && paragraph.className.indexOf("uppercase") !== -1) return;
      if (paragraph.querySelector("strong, a")) return;
      paragraph.classList.add("adkin-body-muted");
    });
  }

  function initScrollReveal() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var targets = [];

    document.querySelectorAll("main > section, body.adkin-demo > section[id]").forEach(function (el) {
      if (el.querySelector(".adkin-hero-classic, .adkin-hero-premium")) return;
      if (el.querySelector(".adkin-glass-nav") && el.className.indexOf("min-h-") !== -1) return;
      targets.push(el);
    });

    document.querySelectorAll("#contacto .grid > div").forEach(function (el) {
      targets.push(el);
    });

    targets.forEach(function (el, index) {
      el.classList.add("adkin-reveal", "adkin-reveal--left");
      if (index % 4 === 1) el.classList.add("adkin-reveal--d1");
      if (index % 4 === 2) el.classList.add("adkin-reveal--d2");
      if (index % 4 === 3) el.classList.add("adkin-reveal--d3");
    });

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -5% 0px" }
    );

    targets.forEach(function (el) {
      observer.observe(el);
    });
  }

  function initHeroReveal() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var heroBlocks = document.querySelectorAll(
      ".adkin-hero-classic > div, .adkin-hero-classic > aside, .adkin-hero-premium > *"
    );

    heroBlocks.forEach(function (el, index) {
      el.classList.add("adkin-reveal");
      if (index > 0) el.classList.add("adkin-reveal--d" + Math.min(index, 4));
    });

    window.requestAnimationFrame(function () {
      window.setTimeout(function () {
        heroBlocks.forEach(function (el, index) {
          window.setTimeout(function () {
            el.classList.add("is-visible");
          }, 80 + index * 90);
        });
      }, 120);
    });
  }

  function initAdkinBrand() {
    if (document.querySelector(".adkin-brand-badge")) return;

    var isLight = document.body.classList.contains("adkin-theme-light");
    var subtitle = "";
    var footer = document.querySelector("footer");

    if (footer) {
      var lines = footer.querySelectorAll("p");
      if (lines.length > 1) {
        subtitle = (lines[1].textContent || "").trim();
      } else if (lines.length === 1) {
        subtitle = "";
      }
    }

    var badge = document.createElement("a");
    badge.href = "./index.html";
    badge.className = "adkin-brand-badge adkin-badge-glow" + (isLight ? " adkin-brand-badge--light" : "");
    badge.setAttribute("aria-label", "Demo desarrollada por Adkin IQ");
    badge.innerHTML =
      '<span class="adkin-brand-badge__label">Crafted by</span>' +
      '<span class="adkin-brand-badge__name">Adkin IQ</span>';
    document.body.appendChild(badge);

    if (!footer) return;

    footer.className = "adkin-brand-footer" + (isLight ? " adkin-brand-footer--light" : "");
    footer.innerHTML =
      '<div class="adkin-brand-footer__inner">' +
      '<div class="adkin-brand-footer__copy">' +
      '<span class="adkin-brand-footer__eyebrow">Experiencia digital premium</span>' +
      '<p class="adkin-brand-footer__title">Demo interactiva desarrollada por <strong>Adkin IQ</strong></p>' +
      (subtitle ? '<p class="adkin-brand-footer__subtitle">' + escapeHtml(subtitle) + "</p>" : "") +
      "</div>" +
      '<a href="./index.html" class="adkin-brand-footer__cta">Ver todas las propuestas</a>' +
      "</div>";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
