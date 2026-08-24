// 3D Kentucky landmass for the hero: the Commonwealth extruded into a slab,
// with glowing distillery nodes and bourbon-trail arcs pulsing out of
// Louisville. Mirrors the map below. Degrades to a clean background if
// WebGL / Three / the geometry aren't available.
import * as THREE from "https://esm.sh/three@0.160.0";

const canvas = document.getElementById("globe");
if (canvas && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  try {
    initKentucky(canvas);
  } catch (e) {
    canvas.style.display = "none";
  }
}

// "M x,y L x,y ... Z" -> [[x,y], ...]
function parseOutline(d) {
  const nums = (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  const pts = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
  return pts;
}

function initKentucky(canvas) {
  const geo = window.KY_GEO;
  if (!geo || !geo.paths || !geo.paths[0]) throw new Error("no KY geometry");
  const raw = parseOutline(geo.paths[0]);
  if (raw.length < 3) throw new Error("bad outline");

  // svg-space bbox -> centered world space (flip Y: svg is y-down)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  raw.forEach(([x, y]) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); });
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const scale = 5.4 / (maxX - minX);
  const tx = (x) => (x - cx) * scale;
  const ty = (y) => -(y - cy) * scale;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 6.6);

  const group = new THREE.Group();
  group.rotation.x = -0.5;   // tilt to reveal the extrusion depth
  scene.add(group);

  // --- lighting ---
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const key = new THREE.DirectionalLight(0xfff1dc, 1.15); key.position.set(3, 5, 6); scene.add(key);
  const amberLight = new THREE.PointLight(0xcf9440, 1.5, 40); amberLight.position.set(-3, 2, 4); scene.add(amberLight);

  // --- extruded Kentucky slab ---
  const shape = new THREE.Shape();
  raw.forEach(([x, y], i) => { const X = tx(x), Y = ty(y); i ? shape.lineTo(X, Y) : shape.moveTo(X, Y); });
  shape.closePath();
  const depth = 0.42;
  const slabGeo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: 0.045, bevelSize: 0.04, bevelSegments: 2, steps: 1,
  });
  slabGeo.translate(0, 0, -depth / 2); // center the depth on z=0; front face ~ +0.25
  const slab = new THREE.Mesh(slabGeo, new THREE.MeshStandardMaterial({ color: 0x241812, metalness: 0.35, roughness: 0.55 }));
  group.add(slab);

  const FZ = 0.30; // decoration plane sitting just above the front bevel

  // --- amber border trace on the front face ---
  const outlinePts = raw.map(([x, y]) => new THREE.Vector3(tx(x), ty(y), FZ - 0.02));
  outlinePts.push(outlinePts[0].clone());
  group.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(outlinePts),
    new THREE.LineBasicMaterial({ color: 0xcf9440, transparent: true, opacity: 0.65 })
  ));

  // --- distillery nodes + Louisville hub (within-100mi set, mirrors the map) ---
  const ACTIVE = ["clermont", "bardstown", "frankfort", "lawrenceburg", "loretto", "versailles", "lexington", "danville"];
  const homeXY = geo.towns.louisville;
  const home = new THREE.Vector3(tx(homeXY[0]), ty(homeXY[1]), FZ);

  const nodeMat = new THREE.MeshBasicMaterial({ color: 0xe0a84e });
  ACTIVE.forEach((id) => {
    const p = geo.towns[id];
    if (!p) return;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 14), nodeMat);
    m.position.set(tx(p[0]), ty(p[1]), FZ);
    group.add(m);
  });
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.085, 18, 18), new THREE.MeshBasicMaterial({ color: 0xf3c874 }));
  hub.position.copy(home);
  group.add(hub);
  // soft halo ring around the hub
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.11, 0.14, 32),
    new THREE.MeshBasicMaterial({ color: 0xcf9440, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
  );
  halo.position.copy(home);
  group.add(halo);

  // --- bourbon-trail arcs lifting toward the viewer ---
  const arcs = [];
  ACTIVE.forEach((id, i) => {
    const p = geo.towns[id];
    if (!p) return;
    const dest = new THREE.Vector3(tx(p[0]), ty(p[1]), FZ);
    const mid = home.clone().add(dest).multiplyScalar(0.5);
    mid.z += 0.4 + home.distanceTo(dest) * 0.28; // arc rises off the slab
    const curve = new THREE.QuadraticBezierCurve3(home, mid, dest);
    const pts = curve.getPoints(50);
    group.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0xcf9440, transparent: true, opacity: 0.3 })
    ));
    const pulse = new THREE.Points(
      new THREE.BufferGeometry().setFromPoints([pts[0]]),
      new THREE.PointsMaterial({ color: 0xf3c874, size: 0.13, sizeAttenuation: true, transparent: true })
    );
    group.add(pulse);
    arcs.push({ curve, pulse, offset: (i / ACTIVE.length), speed: 0.16 + (i % 3) * 0.04 });
  });

  // --- pointer parallax ---
  let targetX = 0, targetY = 0;
  window.addEventListener("pointermove", (e) => {
    targetX = (e.clientX / window.innerWidth - 0.5) * 0.5;
    targetY = (e.clientY / window.innerHeight - 0.5) * 0.35;
  }, { passive: true });

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Tuck Kentucky into the top-right so it doesn't sit behind the headline.
    // Portrait (mobile) keeps it high and near-center; landscape pushes right.
    const portrait = camera.aspect < 1;
    group.position.set(portrait ? 0.35 : 1.7, portrait ? 1.7 : 1.0, 0);
    group.scale.setScalar(portrait ? 0.72 : 0.92);
  }
  window.addEventListener("resize", resize);
  resize();

  const clock = new THREE.Clock();
  function tick() {
    const t = clock.getElapsedTime();
    // gentle rock so Kentucky always reads right-side-up, plus pointer parallax
    group.rotation.y = Math.sin(t * 0.16) * 0.42 + targetX;
    group.rotation.x = -0.5 - targetY * 0.55;
    halo.material.opacity = 0.35 + 0.2 * Math.sin(t * 1.6);
    halo.quaternion.copy(camera.quaternion);
    for (const a of arcs) {
      const u = (t * a.speed + a.offset) % 1;
      const p = a.curve.getPoint(u);
      a.pulse.geometry.setFromPoints([p]);
      a.pulse.material.opacity = Math.sin(u * Math.PI);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}
