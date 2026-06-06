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
})();
