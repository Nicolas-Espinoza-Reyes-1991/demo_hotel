(function () {
  var preloader = document.getElementById("casona-preloader");
  var progressBar = document.getElementById("casona-preloader-progress");
  var MIN_MS = 500;
  var MAX_MS = 3000;
  var start = Date.now();
  var dismissed = false;
  var progress = 0;
  var progressTimer = null;

  document.documentElement.classList.add("casona-is-loading");

  function setProgress(value) {
    progress = Math.min(100, Math.max(progress, value));
    if (progressBar) {
      progressBar.style.width = progress + "%";
    }
  }

  function loadDeferredHeroSlides() {
    var slides = document.querySelectorAll(".casona-hero__slide[data-src]");
    slides.forEach(function (img) {
      var src = img.getAttribute("data-src");
      if (!src) return;
      img.src = src;
      img.removeAttribute("data-src");
    });
  }

  function dismissPreloader() {
    if (dismissed || !preloader) return;
    dismissed = true;
    if (progressTimer) window.clearInterval(progressTimer);
    setProgress(100);
    preloader.classList.add("is-hidden");
    document.documentElement.classList.remove("casona-is-loading");
    loadDeferredHeroSlides();
    window.setTimeout(function () {
      if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
    }, 650);
    window.dispatchEvent(new Event("casona:ready"));
  }

  function isReady() {
    var domReady =
      document.readyState === "interactive" || document.readyState === "complete";
    var heroImg = document.querySelector(".casona-hero__slide.is-active");
    var heroReady = !heroImg || heroImg.complete;
    return domReady && heroReady;
  }

  function tickProgress() {
    var elapsed = Date.now() - start;
    var base = 0;
    if (document.readyState === "interactive" || document.readyState === "complete") base += 45;
    var heroImg = document.querySelector(".casona-hero__slide.is-active");
    if (!heroImg || heroImg.complete) base += 35;
    var target = Math.min(95, base + Math.floor((elapsed / MIN_MS) * 20));
    setProgress(target);

    if (elapsed >= MIN_MS && isReady()) {
      dismissPreloader();
    }
  }

  function bindImage(img, weight) {
    if (!img) return;
    if (img.complete) {
      setProgress(progress + weight);
      return;
    }
    img.addEventListener("load", tickProgress, { once: true });
    img.addEventListener("error", tickProgress, { once: true });
  }

  bindImage(document.querySelector(".casona-hero__slide.is-active"), 20);
  bindImage(document.querySelector(".casona-hero__logo img"), 10);

  document.addEventListener("readystatechange", tickProgress);
  document.addEventListener("DOMContentLoaded", tickProgress);
  window.addEventListener("load", tickProgress);
  progressTimer = window.setInterval(tickProgress, 120);
  window.setTimeout(dismissPreloader, MAX_MS);
  tickProgress();
})();
