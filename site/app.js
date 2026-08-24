(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const fmt = (n) => n.toLocaleString("en-US");
  const NS = "http://www.w3.org/2000/svg";
  const elNS = (t) => document.createElementNS(NS, t);

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
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
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
      el.textContent = out + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = (decimals > 0 ? target.toFixed(decimals) : fmt(target)) + suffix;
    };
    requestAnimationFrame(step);
  };
  const statIO = new IntersectionObserver(
    (entries) => { entries.forEach((e) => { if (e.isIntersecting) { animateCount(e.target); statIO.unobserve(e.target); } }); },
    { threshold: 0.6 }
  );
  $$(".stat-num").forEach((el) => statIO.observe(el));

  /* ---------- Kentucky Bourbon Trail map ---------- */
  const TOWNS = {
    louisville:   { name: "Louisville",   distillery: "Home terminal · Old Forester",  loads: 1240, miles: 78,  ontime: 99.4, home: true },
    clermont:     { name: "Clermont",     distillery: "Jim Beam",                       loads: 1020, miles: 30,  ontime: 99.5 },
    bardstown:    { name: "Bardstown",    distillery: "Heaven Hill · Barton 1792",      loads: 980,  miles: 41,  ontime: 99.5 },
    frankfort:    { name: "Frankfort",    distillery: "Buffalo Trace",                  loads: 1110, miles: 55,  ontime: 99.3 },
    lawrenceburg: { name: "Lawrenceburg", distillery: "Wild Turkey · Four Roses",       loads: 815,  miles: 66,  ontime: 99.4 },
    loretto:      { name: "Loretto",      distillery: "Maker's Mark",                   loads: 720,  miles: 62,  ontime: 99.6 },
    versailles:   { name: "Versailles",   distillery: "Woodford Reserve",               loads: 588,  miles: 70,  ontime: 99.2 },
    lexington:    { name: "Lexington",    distillery: "Town Branch · Barrel House",     loads: 640,  miles: 85,  ontime: 99.1 },
    danville:     { name: "Danville",     distillery: "Wilderness Trail",               loads: 402,  miles: 92,  ontime: 98.9 },
    owensboro:    { name: "Owensboro",    distillery: "Green River",                    loads: 356,  miles: 108, ontime: 98.8 },
  };
  const kysvg = $("#kymap");
  const geo = window.KY_GEO;
  if (kysvg && geo) {
    kysvg.setAttribute("viewBox", geo.viewBox);
    geo.paths.forEach((d) => { const p = elNS("path"); p.setAttribute("d", d); p.setAttribute("class", "ky-state"); kysvg.appendChild(p); });
    const home = geo.towns.louisville;
    const routeEls = {};
    Object.keys(TOWNS).forEach((id) => {
      if (id === "louisville" || !geo.towns[id]) return;
      const t = geo.towns[id];
      const mx = (home[0] + t[0]) / 2, my = (home[1] + t[1]) / 2;
      const dx = t[0] - home[0], dy = t[1] - home[1];
      const len = Math.hypot(dx, dy) || 1;
      const off = Math.min(26, len * 0.16);
      const cx = mx - (dy / len) * off, cy = my + (dx / len) * off;
      const path = elNS("path");
      path.setAttribute("d", `M${home[0]},${home[1]} Q${cx},${cy} ${t[0]},${t[1]}`);
      path.setAttribute("class", "route");
      kysvg.appendChild(path);
      routeEls[id] = path;
    });
    const readout = { eyebrow: $("#mapReadout .readout-eyebrow"), city: $("#mapReadout .readout-city"), role: $("#mapReadout .readout-role"), loads: $("#rmLoads"), miles: $("#rmMiles"), ontime: $("#rmOnTime") };
    const setReadout = (d) => {
      readout.eyebrow.textContent = d.home ? "Home terminal" : "Bourbon Trail stop";
      readout.city.textContent = d.name + ", KY";
      readout.role.textContent = d.distillery;
      readout.loads.textContent = fmt(d.loads);
      readout.miles.textContent = fmt(d.miles);
      readout.ontime.textContent = d.ontime.toFixed(1) + "%";
    };
    const makeStop = (id) => {
      const d = TOWNS[id], pos = geo.towns[id];
      if (!pos) return null;
      const g = elNS("g");
      g.setAttribute("class", "hub" + (d.home ? " hub-home active" : ""));
      g.setAttribute("tabindex", "0"); g.setAttribute("role", "button");
      g.setAttribute("aria-label", d.name + ", " + d.distillery);
      if (d.home) { const ring = elNS("circle"); ring.setAttribute("cx", pos[0]); ring.setAttribute("cy", pos[1]); ring.setAttribute("r", 12); ring.setAttribute("class", "hub-ring"); g.appendChild(ring); }
      const dot = elNS("circle"); dot.setAttribute("cx", pos[0]); dot.setAttribute("cy", pos[1]); dot.setAttribute("r", d.home ? 6 : 4.5); dot.setAttribute("class", "hub-dot"); g.appendChild(dot);
      const label = elNS("text"); label.setAttribute("x", pos[0]); label.setAttribute("y", pos[1] - 11); label.setAttribute("text-anchor", "middle"); label.setAttribute("class", "hub-label"); label.textContent = d.name; g.appendChild(label);
      const activate = () => {
        $$(".hub", kysvg).forEach((n) => n.classList.remove("active"));
        g.classList.add("active");
        Object.values(routeEls).forEach((p) => p.setAttribute("class", "route"));
        if (!d.home && routeEls[id]) routeEls[id].setAttribute("class", "route route-active");
        setReadout(d);
      };
      g.addEventListener("mouseenter", activate);
      g.addEventListener("focus", activate);
      g.addEventListener("click", activate);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); } });
      return g;
    };
    Object.keys(TOWNS).forEach((id) => { if (id !== "louisville") { const g = makeStop(id); if (g) kysvg.appendChild(g); } });
    const homeG = makeStop("louisville"); if (homeG) kysvg.appendChild(homeG);
  }

  /* ---------- Animated charts ---------- */
  // Bar chart — barrels moved / month
  (function () {
    const svg = $("#barChart"), xrow = $("#barChartX");
    if (!svg) return;
    const months = ["S", "O", "N", "D", "J", "F", "M", "A", "M", "J", "J", "A"];
    const data = [12, 14, 13, 16, 15, 18, 17, 19, 21, 20, 23, 26];
    const W = 340, H = 150, pad = 6, n = data.length;
    const gap = (W - pad * 2) / n, bw = gap * 0.6, max = Math.max(...data);
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    data.forEach((v, i) => {
      const h = (v / max) * (H - 16);
      const x = pad + i * gap + (gap - bw) / 2;
      const r = elNS("rect");
      r.setAttribute("x", x); r.setAttribute("y", H - h); r.setAttribute("width", bw); r.setAttribute("height", h);
      r.setAttribute("rx", 2); r.setAttribute("class", "bar");
      r.style.animationDelay = (i * 28) + "ms";
      svg.appendChild(r);
    });
    if (xrow) xrow.innerHTML = months.map((m) => `<span>${m}</span>`).join("");
  })();

  // Donut — freight mix
  (function () {
    const svg = $("#donutChart"), legend = $("#donutLegend");
    if (!svg) return;
    const segs = [ { label: "Barrels & bulk", val: 52 }, { label: "Case & pallet", val: 33 }, { label: "White-glove", val: 15 } ];
    const r = 64, C = 2 * Math.PI * r, shades = ["seg-1", "seg-2", "seg-3"];
    let acc = 0;
    segs.forEach((s, i) => {
      const frac = s.val / 100;
      const c = elNS("circle");
      c.setAttribute("cx", 90); c.setAttribute("cy", 90); c.setAttribute("r", r);
      c.setAttribute("class", "donut-seg " + shades[i]);
      c.setAttribute("stroke-dasharray", `${C} ${C}`);
      const target = C * (1 - frac);
      c.setAttribute("stroke-dashoffset", target); // resting state = visible/final
      c.style.setProperty("--c", C);
      c.style.setProperty("--target", target);
      c.style.transform = `rotate(${acc * 360}deg)`;
      c.style.animationDelay = (i * 120) + "ms";
      svg.appendChild(c);
      acc += frac;
    });
    if (legend) legend.innerHTML = segs.map((s, i) => `<li><span class="sw ${shades[i]}"></span>${s.label} <em>${s.val}%</em></li>`).join("");
  })();

  // Lane bars — busiest lanes
  (function () {
    const ul = $("#laneBars");
    if (!ul) return;
    const lanes = [ { l: "Louisville → Chicago", v: 100 }, { l: "Louisville → Atlanta", v: 82 }, { l: "Louisville → Dallas", v: 74 }, { l: "Louisville → Nashville", v: 61 }, { l: "Louisville → New York", v: 48 } ];
    ul.innerHTML = lanes.map((x, i) => `<li><div class="lane-row"><span>${x.l}</span></div><div class="lane-track"><span class="lane-fill" style="--w:${x.v}%;animation-delay:${i * 55}ms"></span></div></li>`).join("");
  })();

  // Charts animate in via pure CSS keyframes, gated on the site-wide reveal
  // observer's `.in` class (added to each .chart-card). Their resting state is
  // the final/visible state, so a missed observer can never leave one blank.

  /* ---------- Instant quote calculator ---------- */
  const miles = $("#q_miles"), weight = $("#q_weight"), equip = $("#q_equip"), rush = $("#q_rush");
  const milesOut = $("#milesOut"), weightOut = $("#weightOut");
  const estLow = $("#estLow"), estHigh = $("#estHigh"), estPerMile = $("#estPerMile"), estTransit = $("#estTransit");

  const calcQuote = () => {
    const mi = +miles.value, wt = +weight.value, eqMult = +equip.value;
    let perMile = Math.max(1.85, 3.4 - mi / 900);
    perMile *= eqMult;
    if (wt > 30000) perMile *= 1.08;
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

  /* ---------- Form handlers (client-side demo) ---------- */
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
