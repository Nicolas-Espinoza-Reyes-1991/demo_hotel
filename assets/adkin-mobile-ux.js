(function () {
  document.documentElement.classList.add("adkin-ready");

  var switcher = document.querySelector("[data-adkin-demo-switcher]");
  if (switcher) {
    var track = switcher.querySelector(".adkin-demo-switcher__track");
    var current = switcher.querySelector("a[aria-current='page']");
    if (track && current) {
      current.scrollIntoView({ inline: "center", block: "nearest", behavior: "auto" });
    }
  }

  initMobileHamburger();
  initSmoothAnchorOffset();
  initContactForms();
  initMobileViewport();

  function initMobileHamburger() {
    var sourceNav = document.querySelector(".adkin-mobile-nav");
    if (!sourceNav || !document.body.classList.contains("adkin-demo")) return;

    var links = sourceNav.querySelectorAll(".adkin-mobile-nav__track a");
    if (!links.length) return;

    var header =
      document.querySelector(".adkin-glass-nav") ||
      document.querySelector("header.sticky") ||
      document.querySelector("header");

    if (!header) return;

    var isLight = sourceNav.classList.contains("adkin-mobile-nav--light");
    var theme = detectTheme();
    var hotelName = getHotelName(header);
    var waLink = document.querySelector(".wa-floating__btn");

    document.body.classList.add("adkin-has-hamburger");

    var overlay = document.createElement("div");
    overlay.className = "adkin-drawer-overlay";
    overlay.setAttribute("aria-hidden", "true");

    var drawer = document.createElement("aside");
    drawer.id = "adkin-mobile-drawer";
    drawer.className = "adkin-drawer adkin-drawer--" + (isLight ? "light" : "dark");
    if (theme) drawer.classList.add("adkin-drawer--" + theme);
    drawer.setAttribute("aria-hidden", "true");
    drawer.setAttribute("aria-label", "Menú de navegación");

    var head = document.createElement("div");
    head.className = "adkin-drawer__head";
    head.innerHTML =
      '<span class="adkin-drawer__title">' +
      escapeHtml(hotelName) +
      '</span><button type="button" class="adkin-drawer__close" aria-label="Cerrar menú">×</button>';

    var nav = document.createElement("nav");
    nav.className = "adkin-drawer__nav";
    nav.setAttribute("aria-label", "Secciones del hotel");

    links.forEach(function (link) {
      var clone = link.cloneNode(true);
      clone.className = "adkin-drawer__link";
      var text = (clone.textContent || "").trim().toLowerCase();
      var isCta = /reserv/.test(text);
      clone.classList.add(isCta ? "adkin-drawer__link--cta" : "adkin-drawer__link--muted");
      nav.appendChild(clone);
    });

    drawer.appendChild(head);
    drawer.appendChild(nav);

    if (waLink && waLink.href) {
      var waWrap = document.createElement("div");
      waWrap.className = "adkin-drawer__wa";
      var waAnchor = document.createElement("a");
      waAnchor.href = waLink.href;
      waAnchor.target = "_blank";
      waAnchor.rel = "noopener noreferrer";
      waAnchor.textContent = "WhatsApp directo";
      waWrap.appendChild(waAnchor);
      drawer.appendChild(waWrap);
    }

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "adkin-hamburger" + (isLight ? " adkin-hamburger--light" : "");
    btn.setAttribute("aria-label", "Abrir menú");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", "adkin-mobile-drawer");
    btn.innerHTML =
      '<span class="adkin-hamburger__bar"></span><span class="adkin-hamburger__bar"></span><span class="adkin-hamburger__bar"></span>';

    insertHamburgerButton(header, btn);

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    var closeBtn = drawer.querySelector(".adkin-drawer__close");
    var open = false;

    function setOpen(next) {
      open = next;
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
      drawer.classList.toggle("is-open", open);
      overlay.classList.toggle("is-open", open);
      drawer.setAttribute("aria-hidden", String(!open));
      overlay.setAttribute("aria-hidden", String(!open));
      document.body.classList.toggle("adkin-drawer-open", open);
      if (open) closeBtn.focus();
      else btn.focus();
    }

    btn.addEventListener("click", function () {
      setOpen(!open);
    });

    closeBtn.addEventListener("click", function () {
      setOpen(false);
    });

    overlay.addEventListener("click", function () {
      setOpen(false);
    });

    drawer.querySelectorAll("a").forEach(function (anchor) {
      anchor.addEventListener("click", function () {
        setOpen(false);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && open) setOpen(false);
    });

    window.matchMedia("(min-width: 768px)").addEventListener("change", function (event) {
      if (event.matches && open) setOpen(false);
    });
  }

  function insertHamburgerButton(header, btn) {
    var row = header.querySelector(":scope > div.flex") || header.querySelector(".flex");
    if (!row) {
      header.appendChild(btn);
      return;
    }

    var desktopNav = row.querySelector("nav.hidden");
    if (desktopNav) {
      row.insertBefore(btn, desktopNav);
      return;
    }

    row.appendChild(btn);
  }

  function getHotelName(header) {
    var row = header.querySelector(":scope > div.flex") || header;
    var brand = row.children[0];

    if (brand && (brand.tagName === "A" || brand.tagName === "SPAN") && brand.textContent) {
      return brand.textContent.trim();
    }

    return "Menú";
  }

  function detectTheme() {
    var path = (window.location.pathname || "").toLowerCase();
    if (path.indexOf("propuesta-2") !== -1) return "eco";
    if (path.indexOf("propuesta-3") !== -1) return "family";
    if (path.indexOf("propuesta-4") !== -1) return "corp";
    if (path.indexOf("propuesta-5") !== -1) return "riviera";
    if (path.indexOf("propuesta-6") !== -1) return "avant";
    return "";
  }

  function initSmoothAnchorOffset() {
    if (!document.body.classList.contains("adkin-demo")) return;

    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener("click", function (event) {
        var id = anchor.getAttribute("href");
        if (!id || id === "#") return;

        var target = document.querySelector(id);
        if (!target) return;

        event.preventDefault();
        scrollToAnchorTarget(target);
        history.replaceState(null, "", id);
      });
    });
  }

  function getMobileScrollOffset() {
    var rootStyles = getComputedStyle(document.documentElement);
    var mobileTop = parseFloat(rootStyles.getPropertyValue("--adkin-mobile-top"));
    if (!isNaN(mobileTop) && mobileTop > 0) return mobileTop + 12;
    return 76;
  }

  function scrollToAnchorTarget(target) {
    var offset = getMobileScrollOffset();
    var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function initContactForms() {
    document.querySelectorAll(".adkin-contact-form").forEach(function (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();

        var submitBtn = form.querySelector('button[type="submit"]');
        var feedback = form.querySelector(".adkin-contact-form__success");
        var hotel = form.getAttribute("data-hotel") || "el hotel";

        if (submitBtn) submitBtn.disabled = true;

        if (feedback) {
          feedback.hidden = false;
          feedback.textContent =
            "Gracias por contactar a " +
            hotel +
            ". Te responderemos a la brevedad. (Demo interactiva — sin envío real).";
        }

        form.reset();

        if (submitBtn) {
          window.setTimeout(function () {
            submitBtn.disabled = false;
          }, 1800);
        }
      });
    });
  }

  function initMobileViewport() {
    if (!document.body.classList.contains("adkin-demo")) return;

    var sync = function () {
      if (!window.matchMedia("(max-width: 767px)").matches) {
        document.documentElement.style.removeProperty("--adkin-mobile-top");
        return;
      }

      var switcher = document.querySelector(".adkin-demo-switcher");
      var header = document.querySelector("header.sticky") || document.querySelector("header");
      var total = 0;

      if (switcher) total += switcher.getBoundingClientRect().height;
      if (header && header.classList.contains("sticky")) {
        total += header.getBoundingClientRect().height;
      }

      document.documentElement.style.setProperty("--adkin-mobile-top", total + "px");
    };

    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", function () {
      window.setTimeout(sync, 120);
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(sync);
    }

    if (typeof ResizeObserver !== "undefined") {
      var switcher = document.querySelector(".adkin-demo-switcher");
      var header = document.querySelector("header.sticky");
      var observer = new ResizeObserver(sync);
      if (switcher) observer.observe(switcher);
      if (header) observer.observe(header);
    }
  }
})();
