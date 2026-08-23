// 3D freight-network globe for the hero. Degrades gracefully if WebGL/Three fails.
import * as THREE from "https://esm.sh/three@0.160.0";

const canvas = document.getElementById("globe");
if (canvas && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  try {
    initGlobe(canvas);
  } catch (e) {
    // Leave the hero background clean if 3D can't run.
    canvas.style.display = "none";
  }
}

function initGlobe(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 6.2);

  const group = new THREE.Group();
  group.rotation.z = 0.35;
  scene.add(group);

  const R = 2;

  // --- Wireframe sphere ---
  const wire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(R, 4),
    new THREE.MeshBasicMaterial({ color: 0x2a2f3d, wireframe: true, transparent: true, opacity: 0.35 })
  );
  group.add(wire);

  // --- Solid inner sphere for depth ---
  const inner = new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.985, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x0c0e14 })
  );
  group.add(inner);

  // --- Glowing dot grid on the surface (fibonacci sphere) ---
  const N = 900;
  const dotPos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / N);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    dotPos[i * 3] = R * Math.sin(phi) * Math.cos(theta);
    dotPos[i * 3 + 1] = R * Math.cos(phi);
    dotPos[i * 3 + 2] = R * Math.sin(phi) * Math.sin(theta);
  }
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute("position", new THREE.BufferAttribute(dotPos, 3));
  const dots = new THREE.Points(
    dotGeo,
    new THREE.PointsMaterial({ color: 0x3a4152, size: 0.028, sizeAttenuation: true })
  );
  group.add(dots);

  // --- Hubs (US-ish coordinates) as bright points ---
  const hubs = [
    [38.25, -85.76], // Louisville
    [32.78, -96.80], // Dallas
    [41.88, -87.63], // Chicago
    [33.75, -84.39], // Atlanta
    [40.71, -74.01], // NYC
    [34.05, -118.24], // LA
    [39.74, -104.99], // Denver
    [29.76, -95.37], // Houston
    [25.76, -80.19], // Miami
    [47.61, -122.33], // Seattle
  ];
  const toVec = (lat, lon, r = R * 1.008) => {
    const p = (90 - lat) * (Math.PI / 180);
    const t = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -r * Math.sin(p) * Math.cos(t),
      r * Math.cos(p),
      r * Math.sin(p) * Math.sin(t)
    );
  };
  const hubGeo = new THREE.BufferGeometry().setFromPoints(hubs.map((h) => toVec(h[0], h[1])));
  const hubPts = new THREE.Points(
    hubGeo,
    new THREE.PointsMaterial({ color: 0xff7a1a, size: 0.11, sizeAttenuation: true })
  );
  group.add(hubPts);

  // --- Arcs from Louisville (hub 0) to the others ---
  const home = toVec(hubs[0][0], hubs[0][1]);
  const arcs = [];
  for (let i = 1; i < hubs.length; i++) {
    const dest = toVec(hubs[i][0], hubs[i][1]);
    const mid = home.clone().add(dest).multiplyScalar(0.5);
    const lift = 1 + 0.35 * (home.distanceTo(dest) / (R * 2));
    mid.normalize().multiplyScalar(R * lift);
    const curve = new THREE.QuadraticBezierCurve3(home, mid, dest);
    const pts = curve.getPoints(60);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.28 });
    group.add(new THREE.Line(geo, mat));

    // moving pulse along the arc
    const pulseGeo = new THREE.BufferGeometry().setFromPoints([pts[0]]);
    const pulse = new THREE.Points(
      pulseGeo,
      new THREE.PointsMaterial({ color: 0xffb057, size: 0.09, sizeAttenuation: true, transparent: true })
    );
    group.add(pulse);
    arcs.push({ curve, pulse, offset: Math.random(), speed: 0.12 + Math.random() * 0.1 });
  }

  // --- Interaction: subtle parallax on pointer ---
  let targetX = 0, targetY = 0;
  window.addEventListener("pointermove", (e) => {
    targetX = (e.clientX / window.innerWidth - 0.5) * 0.4;
    targetY = (e.clientY / window.innerHeight - 0.5) * 0.3;
  }, { passive: true });

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  const clock = new THREE.Clock();
  function tick() {
    const t = clock.getElapsedTime();
    group.rotation.y += 0.0016;
    group.rotation.x += (targetY - group.rotation.x * 0.0 - group.rotation.x) * 0 + 0; // keep stable
    // parallax the whole group gently
    group.position.x += (targetX - group.position.x) * 0.04;
    group.position.y += (-targetY - group.position.y) * 0.04;

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
