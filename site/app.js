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
  };
  const kysvg = $("#kymap");
  const geo = window.KY_GEO;
  if (kysvg && geo) {
    kysvg.setAttribute("viewBox", geo.viewBox);
    geo.paths.forEach((d) => { const p = elNS("path"); p.setAttribute("d", d); p.setAttribute("class", "ky-state"); kysvg.appendChild(p); });
    const home = geo.towns.louisville;
    // Waypoints between Louisville and each stop so the lanes bend like real
    // highways (I-64 east, Bluegrass & BG parkways south) instead of drawing
    // as abstract arcs. Home is prepended and the stop appended automatically.
    // Eastern lanes share an I-64-style trunk out of Louisville (~[514,152])
    // then branch; southern lanes share a Bluegrass-Parkway-style trunk
    // (~[483,184]). The shared segments read as a real road network.
    const ROUTE_WAYPTS = {
      frankfort:    [[500, 150], [514, 152], [550, 157]],
      lexington:    [[500, 150], [514, 152], [566, 165], [604, 180]],
      versailles:   [[500, 150], [514, 152], [560, 173]],
      lawrenceburg: [[500, 150], [514, 152], [548, 181]],
      clermont:     [[479, 176], [483, 190]],
      bardstown:    [[479, 176], [483, 184], [498, 208]],
      loretto:      [[479, 176], [483, 184], [502, 229]],
      danville:     [[479, 176], [483, 184], [522, 206], [560, 231]],
    };
    // Smooth a polyline through its points (midpoint-quadratic) so bends read
    // as roads, not kinks.
    const roadPath = (pts) => {
      if (pts.length < 3) return `M${pts[0][0]},${pts[0][1]} L${pts[1][0]},${pts[1][1]}`;
      let d = `M${pts[0][0]},${pts[0][1]}`;
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
        d += ` Q${pts[i][0]},${pts[i][1]} ${mx},${my}`;
      }
      const n = pts.length - 1;
      d += ` L${pts[n][0]},${pts[n][1]}`;
      return d;
    };
    const routeEls = {};
    Object.keys(TOWNS).forEach((id) => {
      if (id === "louisville" || !geo.towns[id]) return;
      const t = geo.towns[id];
      const pts = [home, ...(ROUTE_WAYPTS[id] || []), t];
      const path = elNS("path");
      path.setAttribute("d", roadPath(pts));
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
    // Per-town label placement [dx, dy, text-anchor] to de-collide the dense
    // central cluster at this zoom. Default is centered above the dot.
    const LABEL_POS = {
      louisville:   [0, -8, "middle"],
      clermont:     [0, -7, "middle"],
      bardstown:    [7, 3.5, "start"],
      frankfort:    [0, -7, "middle"],
      lawrenceburg: [0, 13, "middle"],
      versailles:   [-3, -7, "middle"],
      lexington:    [7, 3, "start"],
      loretto:      [0, 13, "middle"],
      danville:     [7, 3, "start"],
    };
    const makeStop = (id) => {
      const d = TOWNS[id], pos = geo.towns[id];
      if (!pos) return null;
      const g = elNS("g");
      g.setAttribute("class", "hub" + (d.home ? " hub-home active" : ""));
      g.setAttribute("tabindex", "0"); g.setAttribute("role", "button");
      g.setAttribute("aria-label", d.name + ", " + d.distillery);
      if (d.home) { const ring = elNS("circle"); ring.setAttribute("cx", pos[0]); ring.setAttribute("cy", pos[1]); ring.setAttribute("r", 8); ring.setAttribute("class", "hub-ring"); g.appendChild(ring); }
      const dot = elNS("circle"); dot.setAttribute("cx", pos[0]); dot.setAttribute("cy", pos[1]); dot.setAttribute("r", d.home ? 4.5 : 3); dot.setAttribute("class", "hub-dot"); g.appendChild(dot);
      const lp = LABEL_POS[id] || [0, -7, "middle"];
      const label = elNS("text"); label.setAttribute("x", pos[0] + lp[0]); label.setAttribute("y", pos[1] + lp[1]); label.setAttribute("text-anchor", lp[2]); label.setAttribute("class", "hub-label"); label.textContent = d.name; g.appendChild(label);
      const activate = () => {
        $$(".hub", kysvg).forEach((n) => n.classList.remove("active"));
        g.classList.add("active");
        Object.values(routeEls).forEach((p) => p.setAttribute("class", "route"));
        if (!d.home && routeEls[id]) { routeEls[id].setAttribute("class", "route route-active"); routeEls[id].style.strokeDashoffset = "0"; }
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

    /* Scroll-driven route draw: each lane grows from Louisville out to its
       distillery as the section scrolls into view, staggered by order. */
    const drawList = [];
    Object.keys(routeEls).forEach((id) => {
      const p = routeEls[id];
      const len = p.getTotalLength();
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
      drawList.push({ p, len });
    });
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      drawList.forEach((r) => { r.p.style.strokeDashoffset = "0"; });
    } else if (drawList.length) {
      const netSection = $("#network");
      const drawRoutes = () => {
        const rect = netSection.getBoundingClientRect();
        const vh = window.innerHeight || 800;
        const startY = vh * 0.85, endY = vh * 0.12;
        let prog = (startY - rect.top) / (startY - endY);
        prog = Math.max(0, Math.min(1, prog));
        const n = drawList.length;
        drawList.forEach((r, i) => {
          const s = i * (0.5 / n);
          const local = Math.max(0, Math.min(1, (prog - s) / 0.4));
          r.p.style.strokeDashoffset = r.len * (1 - local);
        });
      };
      window.addEventListener("scroll", drawRoutes, { passive: true });
      window.addEventListener("resize", drawRoutes);
      drawRoutes();
    }
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
    const lanes = [ { l: "Louisville → Lexington", v: 100 }, { l: "Louisville → Bardstown", v: 86 }, { l: "Louisville → Frankfort", v: 72 }, { l: "Louisville → Elizabethtown", v: 57 }, { l: "Louisville → Owensboro", v: 43 } ];
    ul.innerHTML = lanes.map((x, i) => `<li><div class="lane-row"><span>${x.l}</span></div><div class="lane-track"><span class="lane-fill" style="--w:${x.v}%;animation-delay:${i * 55}ms"></span></div></li>`).join("");
  })();

  // Charts animate in via pure CSS keyframes, gated on the site-wide reveal
  // observer's `.in` class (added to each .chart-card). Their resting state is
  // the final/visible state, so a missed observer can never leave one blank.

  /* ---------- Dispatch ticker (live-load flavor, in-state lanes) ---------- */
  (function () {
    const track = $("#dispatchTicker");
    if (!track) return;
    const loads = [
      { pair: "Bardstown → Louisville", note: "18 pallets", status: "delivered" },
      { pair: "Louisville → Lexington", note: "barrels", status: "en route" },
      { pair: "Frankfort → Louisville", note: "case & pallet", status: "loading" },
      { pair: "Louisville → Loretto", note: "reefer", status: "scheduled" },
      { pair: "Versailles → Louisville", note: "white-glove", status: "en route" },
      { pair: "Louisville → Bardstown", note: "12 pallets", status: "delivered" },
      { pair: "Clermont → Louisville", note: "bulk", status: "loading" },
      { pair: "Louisville → Danville", note: "allocated release", status: "en route" },
      { pair: "Elizabethtown → Louisville", note: "case & pallet", status: "delivered" },
    ];
    const item = (l, i) => `<span class="ticker-item"><span class="td"></span>LOAD ${4800 + i * 7} · <b>${l.pair}</b> · ${l.note} · ${l.status}</span>`;
    // Duplicate the run so the -50% translate loop is seamless.
    track.innerHTML = loads.map(item).join("") + loads.map(item).join("");
  })();

  /* ---------- Instant quote calculator (Louisville origin fixed) ---------- */
  const city = $("#q_city"), weight = $("#q_weight"), equip = $("#q_equip"), rush = $("#q_rush");
  const distOut = $("#distOut"), weightOut = $("#weightOut");
  const estLow = $("#estLow"), estHigh = $("#estHigh"), estPerMile = $("#estPerMile"), estTransit = $("#estTransit");

  const calcQuote = () => {
    const mi = +city.value, wt = +weight.value, eqMult = +equip.value;
    let perMile = Math.max(1.85, 3.4 - mi / 900);
    perMile *= eqMult;
    if (wt > 30000) perMile *= 1.08;
    if (rush.checked) perMile *= 1.12;
    const base = perMile * mi;
    const low = Math.round((base * 0.93) / 5) * 5;
    const high = Math.round((base * 1.09) / 5) * 5;
    const transit = Math.max(1, Math.ceil(mi / 550));
    distOut.textContent = fmt(mi) + " mi from Louisville";
    weightOut.textContent = fmt(wt) + " lbs";
    estLow.textContent = "$" + fmt(low);
    estHigh.textContent = "$" + fmt(high);
    estPerMile.textContent = "$" + perMile.toFixed(2);
    estTransit.textContent = transit + (transit === 1 ? " day" : " days");
  };
  [city, weight, equip, rush].forEach((el) => el && ["input", "change"].forEach((ev) => el.addEventListener(ev, calcQuote)));
  if (city) calcQuote();

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
