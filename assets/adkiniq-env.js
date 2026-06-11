/**
 * URLs de producción Adkin IQ — landing hotel + motor de reservas.
 * En localhost sigue usando http://localhost:3000 para desarrollo.
 */
(function (global) {
  var PROD_RESERVAS = "https://reservas.adkiniq.cl";
  var LOCAL_RESERVAS = "http://localhost:3000";

  function isLocalDev() {
    var host = global.location.hostname;
    return host === "localhost" || host === "127.0.0.1";
  }

  function getReservasApiBase() {
    if (isLocalDev()) {
      return global.location.port === "3000" ? "" : LOCAL_RESERVAS;
    }
    return PROD_RESERVAS;
  }

  function getReservasPageUrl() {
    var base = getReservasApiBase();
    return base ? base.replace(/\/$/, "") + "/" : "/";
  }

  function applyReservasLinks() {
    var url = getReservasPageUrl();
    var nodes = global.document.querySelectorAll("[data-reservas-link]");
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].setAttribute("href", url);
    }
  }

  global.AdkiniqEnv = {
    productionHotelUrl: "https://hotel.adkiniq.cl",
    productionReservasUrl: PROD_RESERVAS,
    getReservasApiBase: getReservasApiBase,
    getReservasPageUrl: getReservasPageUrl,
    applyReservasLinks: applyReservasLinks,
  };

  if (global.document && global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", applyReservasLinks);
  } else if (global.document) {
    applyReservasLinks();
  }
})(window);
