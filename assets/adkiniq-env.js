/**
 * URLs de producción Adkin IQ — landing hotel + motor de reservas.
 * En localhost: http://localhost:3000
 * En VPS por IP o hotel.adkiniq.cl: /reservas (mismo nginx, puerto 80)
 * Con DNS completo: https://reservas.adkiniq.cl
 */
(function (global) {
  var PROD_RESERVAS = "https://reservas.adkiniq.cl";
  var LOCAL_RESERVAS = "http://localhost:3000";

  function isLocalDev() {
    var host = global.location.hostname;
    return host === "localhost" || host === "127.0.0.1";
  }

  /** Mismo servidor: landing en / y reservas en /reservas (IP o hotel.adkiniq.cl). */
  function usesPathBasedReservas() {
    var host = global.location.hostname;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
    if (host === "hotel.adkiniq.cl" || host === "www.hotel.adkiniq.cl") return true;
    return false;
  }

  function getReservasPageUrl() {
    if (isLocalDev()) {
      return LOCAL_RESERVAS.replace(/\/$/, "") + "/";
    }
    if (usesPathBasedReservas()) {
      return global.location.origin + "/reservas/";
    }
    return PROD_RESERVAS.replace(/\/$/, "") + "/";
  }

  function getReservasApiBase() {
    if (isLocalDev()) {
      return LOCAL_RESERVAS.replace(/\/$/, "");
    }
    if (usesPathBasedReservas()) {
      return global.location.origin + "/reservas";
    }
    return PROD_RESERVAS.replace(/\/$/, "");
  }

  function applyReservasLinks() {
    var url = getReservasPageUrl();
    var nodes = global.document.querySelectorAll("[data-reservas-link]");
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].setAttribute("href", url);
    }
  }

  function fallbackApiBase() {
    if (isLocalDev()) return LOCAL_RESERVAS.replace(/\/$/, "");
    if (usesPathBasedReservas()) return global.location.origin + "/reservas";
    return PROD_RESERVAS.replace(/\/$/, "");
  }

  function fallbackPageUrl() {
    return getReservasPageUrl();
  }

  global.AdkiniqEnv = {
    productionHotelUrl: "https://hotel.adkiniq.cl",
    productionReservasUrl: PROD_RESERVAS,
    getReservasApiBase: getReservasApiBase,
    getReservasPageUrl: getReservasPageUrl,
    applyReservasLinks: applyReservasLinks,
    fallbackApiBase: fallbackApiBase,
    fallbackPageUrl: fallbackPageUrl,
  };

  function initLinks() {
    applyReservasLinks();
  }

  if (global.document && global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", initLinks);
  } else if (global.document) {
    initLinks();
  }

  /* Safari iOS: restaurar hrefs al volver con bfcache */
  global.addEventListener("pageshow", initLinks);
})(window);
