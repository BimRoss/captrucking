(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const fmt = (n) => n.toLocaleString("en-US");

  document.getElementById("year").textContent = "2026";

  /* ---------- Nav scroll state ---------- */
  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  $$(".reveal").forEach((el) => io.observe(el));

  /* ---------- Animated stat counters ---------- */
  const animateCount = (el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const suffix = el.dataset.suffix || "";
    const dur = 1600;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = target * eased;
      let out;
      if (decimals > 0) out = val.toFixed(decimals);
      else if (target >= 1000) out = fmt(Math.floor(val));
      else out = Math.floor(val).toString();
      el.textContent = out + (p === 1 ? suffix : suffix && p > 0.98 ? suffix : "");
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = (decimals > 0 ? target.toFixed(decimals) : fmt(target)) + suffix;
    };
    requestAnimationFrame(step);
  };
  const statIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          animateCount(e.target);
          statIO.unobserve(e.target);
        }
      });
    },
    { threshold: 0.6 }
  );
  $$(".stat-num").forEach((el) => statIO.observe(el));

  /* ---------- Interactive lane network map ---------- */
  const HOME = { id: "lou", name: "Louisville, KY", role: "Home terminal", x: 638, y: 272, loads: 1240, miles: 612, ontime: 99.4 };
  const HUBS = [
    { id: "sea", name: "Seattle, WA", role: "Pacific NW lane", x: 130, y: 96, loads: 214, miles: 2150, ontime: 98.7 },
    { id: "lax", name: "Los Angeles, CA", role: "West Coast corridor", x: 128, y: 322, loads: 486, miles: 1980, ontime: 98.9 },
    { id: "den", name: "Denver, CO", role: "Mountain lane", x: 352, y: 250, loads: 308, miles: 1120, ontime: 99.1 },
    { id: "dal", name: "Dallas, TX", role: "South Central hub", x: 452, y: 392, loads: 742, miles: 820, ontime: 99.3 },
    { id: "hou", name: "Houston, TX", role: "Gulf Coast lane", x: 486, y: 452, loads: 531, miles: 940, ontime: 99.0 },
    { id: "chi", name: "Chicago, IL", role: "Midwest hub", x: 596, y: 196, loads: 968, miles: 300, ontime: 99.5 },
    { id: "atl", name: "Atlanta, GA", role: "Southeast hub", x: 690, y: 372, loads: 815, miles: 420, ontime: 99.4 },
    { id: "mia", name: "Miami, FL", role: "Southeast corridor", x: 792, y: 512, loads: 397, miles: 920, ontime: 98.8 },
    { id: "nyc", name: "New York, NY", role: "Northeast corridor", x: 832, y: 182, loads: 623, miles: 760, ontime: 99.2 },
  ];
  const NS = "http://www.w3.org/2000/svg";
  const svg = $("#usmap");
  if (svg) {
    // graticule backdrop
    for (let x = 80; x <= 900; x += 82) {
      const l = document.createElementNS(NS, "line");
      l.setAttribute("x1", x); l.setAttribute("y1", 40); l.setAttribute("x2", x); l.setAttribute("y2", 560);
      l.setAttribute("stroke", "rgba(255,255,255,0.03)"); svg.appendChild(l);
    }
    for (let y = 60; y <= 560; y += 72) {
      const l = document.createElementNS(NS, "line");
      l.setAttribute("x1", 60); l.setAttribute("y1", y); l.setAttribute("x2", 900); l.setAttribute("y2", y);
      l.setAttribute("stroke", "rgba(255,255,255,0.03)"); svg.appendChild(l);
    }
    // lanes (curved) from home to each hub
    HUBS.forEach((h) => {
      const mx = (HOME.x + h.x) / 2;
      const my = (HOME.y + h.y) / 2 - Math.abs(HOME.x - h.x) * 0.16 - 20;
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", `M${HOME.x},${HOME.y} Q${mx},${my} ${h.x},${h.y}`);
      path.setAttribute("class", "lane");
      svg.appendChild(path);
    });
    // hub factory
    const readout = { city: $("#mapReadout .readout-city"), role: $("#mapReadout .readout-role"), loads: $("#rmLoads"), miles: $("#rmMiles"), ontime: $("#rmOnTime") };
    const setReadout = (d) => {
      readout.city.textContent = d.name;
      readout.role.textContent = d.role;
      readout.loads.textContent = fmt(d.loads);
      readout.miles.textContent = fmt(d.miles);
      readout.ontime.textContent = d.ontime.toFixed(1) + "%";
    };
    const makeHub = (d, isHome) => {
      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "hub" + (isHome ? " active" : ""));
      g.setAttribute("tabindex", "0");
      g.setAttribute("role", "button");
      g.setAttribute("aria-label", d.name + " freight lane details");
      if (isHome) {
        const ring = document.createElementNS(NS, "circle");
        ring.setAttribute("cx", d.x); ring.setAttribute("cy", d.y); ring.setAttribute("r", 14);
        ring.setAttribute("class", "hub-ring");
        g.appendChild(ring);
      }
      const dot = document.createElementNS(NS, "circle");
      dot.setAttribute("cx", d.x); dot.setAttribute("cy", d.y);
      dot.setAttribute("r", isHome ? 7 : 5);
      dot.setAttribute("class", "hub-dot");
      g.appendChild(dot);
      const label = document.createElementNS(NS, "text");
      label.setAttribute("x", d.x); label.setAttribute("y", d.y - 14);
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("class", "hub-label");
      label.textContent = d.name.split(",")[0];
      g.appendChild(label);
      const activate = () => {
        $$(".hub", svg).forEach((n) => n.classList.remove("active"));
        g.classList.add("active");
        setReadout(d);
      };
      g.addEventListener("mouseenter", activate);
      g.addEventListener("focus", activate);
      g.addEventListener("click", activate);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); } });
      return g;
    };
    HUBS.forEach((h) => svg.appendChild(makeHub(h, false)));
    svg.appendChild(makeHub(HOME, true));
  }

  /* ---------- Instant quote calculator ---------- */
  const miles = $("#q_miles"), weight = $("#q_weight"), equip = $("#q_equip"), rush = $("#q_rush");
  const milesOut = $("#milesOut"), weightOut = $("#weightOut");
  const estLow = $("#estLow"), estHigh = $("#estHigh"), estPerMile = $("#estPerMile"), estTransit = $("#estTransit");

  const calcQuote = () => {
    const mi = +miles.value;
    const wt = +weight.value;
    const eqMult = +equip.value;
    // base per-mile decreases with distance (economies of scale), floor at 1.85
    let perMile = Math.max(1.85, 3.4 - mi / 900);
    perMile *= eqMult;
    if (wt > 30000) perMile *= 1.08; // heavy freight surcharge
    if (rush.checked) perMile *= 1.12;
    const base = perMile * mi;
    const low = Math.round((base * 0.93) / 5) * 5;
    const high = Math.round((base * 1.09) / 5) * 5;
    const transit = Math.max(1, Math.ceil(mi / 550));

    milesOut.textContent = fmt(mi) + " mi";
    weightOut.textContent = fmt(wt) + " lbs";
    estLow.textContent = "$" + fmt(low);
    estHigh.textContent = "$" + fmt(high);
    estPerMile.textContent = "$" + perMile.toFixed(2);
    estTransit.textContent = transit + (transit === 1 ? " day" : " days");
  };
  [miles, weight, equip, rush].forEach((el) => el && el.addEventListener("input", calcQuote));
  if (miles) calcQuote();

  /* ---------- Form handlers (client-side only demo) ---------- */
  const handleForm = (formId, successId) => {
    const form = $("#" + formId);
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const ok = $("#" + successId);
      if (ok) ok.hidden = false;
      form.querySelector("button[type=submit]").textContent = "Sent ✓";
    });
  };
  handleForm("quoteForm", "quoteSuccess");
  handleForm("contactForm", "contactSuccess");
})();
