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

  /** IP del VPS: reservas vía nginx en /reservas (puerto 80). */
  function isDirectServerAccess() {
    var host = global.location.hostname;
    return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  }

  function getReservasApiBase() {
    if (isLocalDev()) {
      return LOCAL_RESERVAS;
    }
    if (isDirectServerAccess()) {
      if (global.location.port === "3000") return "";
      var protocol = global.location.protocol || "http:";
      return protocol + "//" + global.location.hostname + "/reservas";
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
