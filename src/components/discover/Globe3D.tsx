import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";

export type GlobeCity = {
  name: string;
  lat: number;
  lng: number;
  count: number;
  flag?: string;
  tags?: string[];
};

export type GlobeHandle = {
  setAutoRotate: (on: boolean) => void;
  reset: () => void;
  flyToCity: (cityName: string) => void;
  flyRandom: () => void;
};

export type GlobeRegion = "asia" | "europe" | "americas" | "oceania";

type GlobeProps = {
  cities: GlobeCity[];
  /** Height in px. Use "fill" to expand to 100% of parent (parent must have explicit height). */
  size?: number | "fill";
  interactive?: boolean;
  showArcs?: boolean;
  onCityClick?: (city: GlobeCity) => void;
  /** Notified when the visible region (front-facing center longitude) changes. */
  onRegionChange?: (region: GlobeRegion) => void;
};

function latLngToVec3(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function arcCurve(a: THREE.Vector3, b: THREE.Vector3, radius: number) {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const dist = a.distanceTo(b);
  mid.normalize().multiplyScalar(radius + dist * 0.35);
  return new THREE.QuadraticBezierCurve3(a, mid, b);
}

export const Globe3D = forwardRef<GlobeHandle, GlobeProps>(function Globe3D(
  { cities, size = 320, interactive = false, showArcs = false, onCityClick, onRegionChange },
  ref,
) {
  const heightStyle = size === "fill" ? "100%" : `${size}px`;
  const mountRef = useRef<HTMLDivElement>(null);
  const labelLayerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<GlobeHandle | null>(null);
  const onRegionChangeRef = useRef(onRegionChange);
  useEffect(() => {
    onRegionChangeRef.current = onRegionChange;
  }, [onRegionChange]);

  useImperativeHandle(ref, () => ({
    setAutoRotate: (on) => apiRef.current?.setAutoRotate(on),
    reset: () => apiRef.current?.reset(),
    flyToCity: (n) => apiRef.current?.flyToCity(n),
    flyRandom: () => apiRef.current?.flyRandom(),
  }));

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = Math.max(1, mount.clientWidth);
    const height = Math.max(1, mount.clientHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const radius = 2;

    // Glow halo
    const haloGeo = new THREE.SphereGeometry(radius * 1.18, 64, 64);
    const haloMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      uniforms: { c: { value: new THREE.Color(0xa78bfa) } },
      vertexShader: `varying vec3 vNormal;
        void main(){ vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 c; varying vec3 vNormal;
        void main(){ float i = pow(0.65 - dot(vNormal, vec3(0,0,1)), 3.0); gl_FragColor = vec4(c, 1.0) * i; }`,
    });
    globeGroup.add(new THREE.Mesh(haloGeo, haloMat));

    // Sphere base
    const sphereGeo = new THREE.SphereGeometry(radius, 64, 64);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x1a1235,
      transparent: true,
      opacity: 0.9,
    });
    globeGroup.add(new THREE.Mesh(sphereGeo, sphereMat));

    // Wireframe meridians/parallels
    const wireGeo = new THREE.SphereGeometry(radius * 1.001, 36, 24);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x7b5ea7,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    globeGroup.add(new THREE.Mesh(wireGeo, wireMat));

    // Surface dot field
    const dotCount = 1200;
    const dotGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(dotCount * 3);
    for (let i = 0; i < dotCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = radius * 1.005;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    dotGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const dotsMat = new THREE.PointsMaterial({
      color: 0xc4b5fd,
      size: 0.018,
      transparent: true,
      opacity: 0.55,
    });
    globeGroup.add(new THREE.Points(dotGeo, dotsMat));

    // City markers
    type Marker = { city: GlobeCity; mesh: THREE.Mesh; hit?: THREE.Mesh; rings: THREE.Mesh[]; phase: number };
    const markers: Marker[] = [];
    const markerGroup = new THREE.Group();
    globeGroup.add(markerGroup);

    // Detect city density — shrink rings where neighbors are close to avoid merging
    const densityRadius: number[] = cities.map((c) => {
      const a = latLngToVec3(c.lat, c.lng, 1);
      let nearest = Infinity;
      cities.forEach((o) => {
        if (o === c) return;
        const b = latLngToVec3(o.lat, o.lng, 1);
        const d = a.distanceTo(b);
        if (d < nearest) nearest = d;
      });
      // 1 = isolated, 0.55 = very close cluster
      if (nearest > 0.5) return 1;
      if (nearest > 0.25) return 0.8;
      return 0.55;
    });

    cities.forEach((city, idx) => {
      const pos = latLngToVec3(city.lat, city.lng, radius * 1.02);
      const density = densityRadius[idx];
      // Subtle white inner dot
      const dotMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.026, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffffff }),
      );
      dotMesh.position.copy(pos);
      (dotMesh as unknown as { userData: { city: GlobeCity } }).userData = { city };
      // Slightly enlarged invisible hit-target so clicks are reliable
      const hitGeo = new THREE.SphereGeometry(0.07, 12, 12);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hit = new THREE.Mesh(hitGeo, hitMat);
      hit.position.copy(pos);
      (hit as unknown as { userData: { city: GlobeCity } }).userData = { city };
      markerGroup.add(dotMesh);
      markerGroup.add(hit);

      // 3 expanding pulse rings, scaled by local density
      const rings: THREE.Mesh[] = [];
      const baseInner = 0.034 * density;
      const baseOuter = 0.044 * density;
      for (let k = 0; k < 3; k++) {
        const ringGeo = new THREE.RingGeometry(baseInner, baseOuter, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xa78bfa,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(pos);
        ring.lookAt(0, 0, 0);
        ring.userData.maxScale = 2.4 * density; // tighter expansion in clusters
        markerGroup.add(ring);
        rings.push(ring);
      }

      markers.push({ city, mesh: dotMesh, rings, phase: idx * 0.37 });
      // Track hit mesh alongside
      (markers[markers.length - 1] as unknown as { hit: THREE.Mesh }).hit = hit;
    });

    // Country borders (simplified GeoJSON via topojson)
    const borderGroup = new THREE.Group();
    globeGroup.add(borderGroup);
    const borderMat = new THREE.LineBasicMaterial({
      color: 0xa78bfa,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
    });
    let borderCancelled = false;
    (async () => {
      try {
        const [{ feature }, res] = await Promise.all([
          import("topojson-client"),
          fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
        ]);
        if (borderCancelled || !res.ok) return;
        const topo = await res.json();
        const geo = feature(topo, topo.objects.countries) as unknown as {
          features: { geometry: { type: string; coordinates: unknown } }[];
        };
        const r = radius * 1.003;
        const drawRing = (ring: number[][]) => {
          const pts: THREE.Vector3[] = [];
          for (const [lng, lat] of ring) pts.push(latLngToVec3(lat, lng, r));
          const g = new THREE.BufferGeometry().setFromPoints(pts);
          borderGroup.add(new THREE.Line(g, borderMat));
        };
        for (const f of geo.features) {
          const g = f.geometry;
          if (!g) continue;
          if (g.type === "Polygon") {
            for (const ring of g.coordinates as number[][][]) drawRing(ring);
          } else if (g.type === "MultiPolygon") {
            for (const poly of g.coordinates as number[][][][]) {
              for (const ring of poly) drawRing(ring);
            }
          }
        }
      } catch {
        // Silent — borders are optional decoration
      }
    })();

    // Particle flow arcs — dynamic lifecycle
    type FlowArc = {
      line: THREE.Line;
      particles: THREE.Points;
      curve: THREE.QuadraticBezierCurve3;
      birth: number;
      lifetime: number;
      particleOffsets: number[];
    };
    const flowArcs: FlowArc[] = [];
    const MAX_ARCS = 5;
    const SPAWN_INTERVAL_MS = 3000;
    const ARC_LIFETIME_MS = 4000;
    let lastSpawn = 0;

    const spawnArc = (now: number) => {
      if (!showArcs || cities.length < 2) return;
      let i = Math.floor(Math.random() * cities.length);
      let j = Math.floor(Math.random() * cities.length);
      if (i === j) j = (j + 1) % cities.length;
      const a = latLngToVec3(cities[i].lat, cities[i].lng, radius * 1.02);
      const b = latLngToVec3(cities[j].lat, cities[j].lng, radius * 1.02);
      const curve = arcCurve(a, b, radius);
      const pts = curve.getPoints(48);
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: 0xa78bfa,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      });
      const line = new THREE.Line(geo, mat);
      globeGroup.add(line);

      const PCOUNT = 8;
      const pPos = new Float32Array(PCOUNT * 3);
      const pColor = new Float32Array(PCOUNT * 3);
      const offsets: number[] = [];
      const cA = new THREE.Color(0xa78bfa);
      const cB = new THREE.Color(0xc4b5fd);
      for (let k = 0; k < PCOUNT; k++) {
        offsets.push(k / PCOUNT);
        const c = cA.clone().lerp(cB, k / PCOUNT);
        pColor[k * 3] = c.r;
        pColor[k * 3 + 1] = c.g;
        pColor[k * 3 + 2] = c.b;
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
      pGeo.setAttribute("color", new THREE.BufferAttribute(pColor, 3));
      const pMat = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      });
      const particles = new THREE.Points(pGeo, pMat);
      globeGroup.add(particles);

      flowArcs.push({
        line,
        particles,
        curve,
        birth: now,
        lifetime: ARC_LIFETIME_MS,
        particleOffsets: offsets,
      });
    };

    // Interaction
    let isDragging = false;
    let prev = { x: 0, y: 0 };
    let rotVel = { x: 0, y: 0.003 };
    let autoRotate = true;
    const targetRot = { x: 0, y: 0, active: false };
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (e: PointerEvent) => {
      if (!interactive) return;
      isDragging = true;
      targetRot.active = false;
      prev = { x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!interactive || !isDragging) return;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      globeGroup.rotation.y += dx * 0.005;
      globeGroup.rotation.x += dy * 0.005;
      rotVel = { x: dy * 0.0005, y: dx * 0.0005 };
      prev = { x: e.clientX, y: e.clientY };
    };
    const onPointerUp = () => {
      isDragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      if (!interactive) return;
      e.preventDefault();
      camera.position.z = Math.min(10, Math.max(3.5, camera.position.z + e.deltaY * 0.005));
    };
    const onClick = (e: MouseEvent) => {
      if (!interactive || !onCityClick) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(
        markers.flatMap((m) => (m.hit ? [m.hit, m.mesh] : [m.mesh])),
      );
      if (hits.length > 0) {
        const city = (hits[0].object as unknown as { userData: { city: GlobeCity } }).userData.city;
        onCityClick(city);
      }
    };

    if (interactive) {
      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
      renderer.domElement.addEventListener("click", onClick);
      renderer.domElement.style.cursor = "grab";
    }

    // Imperative API
    const flyToCity = (cityName: string) => {
      const c = cities.find((x) => x.name === cityName);
      if (!c) return;
      const phi = (90 - c.lat) * (Math.PI / 180);
      const theta = (c.lng + 180) * (Math.PI / 180);
      // Rotate so the city faces camera (along +z)
      targetRot.y = -theta + Math.PI;
      targetRot.x = Math.PI / 2 - phi;
      targetRot.active = true;
    };
    apiRef.current = {
      setAutoRotate: (on) => {
        autoRotate = on;
      },
      reset: () => {
        targetRot.x = 0;
        targetRot.y = 0;
        targetRot.active = true;
        camera.position.z = 6;
      },
      flyToCity,
      flyRandom: () => {
        const c = cities[Math.floor(Math.random() * cities.length)];
        flyToCity(c.name);
      },
    };

    // Country / region labels — projected from 3D each frame, visibility per zoom level
    type LabelDef = { name: string; lat: number; lng: number; tier: 1 | 2 | 3; meta?: string };
    const countryLabels: LabelDef[] = [
      { name: "Asia", lat: 35, lng: 105, tier: 1 },
      { name: "Europe", lat: 50, lng: 10, tier: 1 },
      { name: "Americas", lat: 15, lng: -90, tier: 1 },
      { name: "Africa", lat: 5, lng: 20, tier: 1 },
      { name: "Oceania", lat: -25, lng: 135, tier: 1 },
    ];
    const districtLabels: LabelDef[] = [
      { name: "江南区", lat: 37.52, lng: 127.04, tier: 3, meta: "412" },
      { name: "弘大", lat: 37.55, lng: 126.92, tier: 3, meta: "287" },
      { name: "涩谷", lat: 35.66, lng: 139.7, tier: 3, meta: "534" },
      { name: "新宿", lat: 35.69, lng: 139.7, tier: 3, meta: "421" },
      { name: "陆家嘴", lat: 31.24, lng: 121.5, tier: 3, meta: "612" },
      { name: "Manhattan", lat: 40.78, lng: -73.97, tier: 3, meta: "498" },
      { name: "Soho", lat: 51.51, lng: -0.13, tier: 3, meta: "234" },
    ];
    type LabelEl = { def: LabelDef; el: HTMLDivElement };
    const labelEls: LabelEl[] = [];
    const layer = labelLayerRef.current;
    if (layer) {
      const make = (def: LabelDef) => {
        const el = document.createElement("div");
        el.className =
          def.tier === 3
            ? "globe-label globe-label--district"
            : def.tier === 2
              ? "globe-label globe-label--city"
              : "globe-label globe-label--country";
        el.style.cssText =
          "position:absolute;pointer-events:none;transform:translate(-50%,-50%);font-size:" +
          (def.tier === 1 ? "12px" : "11px") +
          ";font-weight:600;letter-spacing:0.04em;color:rgba(233,213,255,0.92);text-shadow:0 1px 6px rgba(0,0,0,0.6);white-space:nowrap;opacity:0;transition:opacity 200ms ease;";
        if (def.tier === 1) {
          el.style.textTransform = "uppercase";
          el.style.color = "rgba(196,181,253,0.85)";
        }
        if (def.meta) {
          el.innerHTML = `${def.name} <span style="margin-left:4px;padding:1px 5px;border-radius:9px;background:rgba(167,139,250,0.25);color:#fff;font-size:9px;">${def.meta}</span>`;
        } else {
          el.textContent = def.name;
        }
        layer.appendChild(el);
        labelEls.push({ def, el });
      };
      countryLabels.forEach(make);
      // City labels reuse the cities array (tier 2)
      cities.forEach((c) =>
        make({ name: `${c.flag ?? ""} ${c.name}`, lat: c.lat, lng: c.lng, tier: 2, meta: String(c.count) }),
      );
      districtLabels.forEach(make);
    }

    let lastRegion: GlobeRegion | null = null;
    const tmpVec = new THREE.Vector3();

    let raf = 0;
    const start = performance.now();
    const animate = () => {
      const t = (performance.now() - start) / 1000;
      if (targetRot.active) {
        globeGroup.rotation.x += (targetRot.x - globeGroup.rotation.x) * 0.08;
        globeGroup.rotation.y += (targetRot.y - globeGroup.rotation.y) * 0.08;
        if (
          Math.abs(targetRot.x - globeGroup.rotation.x) < 0.001 &&
          Math.abs(targetRot.y - globeGroup.rotation.y) < 0.001
        ) {
          targetRot.active = false;
        }
      } else if (!isDragging && autoRotate) {
        globeGroup.rotation.y += rotVel.y || 0.0015;
        globeGroup.rotation.x += rotVel.x;
        rotVel.x *= 0.95;
      }
      // Pulse rings (3 staggered, expand + fade fast, ~2s loop, density-aware)
      const PULSE_PERIOD = 2.0;
      markers.forEach((m) => {
        m.rings.forEach((ring, k) => {
          const phase = ((t + m.phase + (k / 3) * PULSE_PERIOD) % PULSE_PERIOD) / PULSE_PERIOD;
          const maxScale = (ring.userData.maxScale as number) ?? 2.4;
          const scale = 1 + phase * (maxScale - 1);
          ring.scale.set(scale, scale, scale);
          // Sharper falloff so rings disappear before reaching neighbours
          (ring.material as THREE.MeshBasicMaterial).opacity = 0.55 * Math.pow(1 - phase, 1.6);
        });
      });

      // Spawn / animate / retire flow arcs
      const nowMs = performance.now();
      if (showArcs && nowMs - lastSpawn > SPAWN_INTERVAL_MS && flowArcs.length < MAX_ARCS) {
        spawnArc(nowMs);
        lastSpawn = nowMs;
      }
      for (let idx = flowArcs.length - 1; idx >= 0; idx--) {
        const arc = flowArcs[idx];
        const age = nowMs - arc.birth;
        const lifeT = age / arc.lifetime;
        if (lifeT >= 1) {
          globeGroup.remove(arc.line);
          globeGroup.remove(arc.particles);
          arc.line.geometry.dispose();
          (arc.line.material as THREE.Material).dispose();
          arc.particles.geometry.dispose();
          (arc.particles.material as THREE.Material).dispose();
          flowArcs.splice(idx, 1);
          continue;
        }
        // Fade in/out envelope
        const env = lifeT < 0.2 ? lifeT / 0.2 : lifeT > 0.7 ? (1 - lifeT) / 0.3 : 1;
        (arc.line.material as THREE.LineBasicMaterial).opacity = 0.25 * env;
        (arc.particles.material as THREE.PointsMaterial).opacity = 0.95 * env;

        // Move particles along curve
        const posAttr = arc.particles.geometry.getAttribute("position") as THREE.BufferAttribute;
        const speed = 0.35;
        for (let k = 0; k < arc.particleOffsets.length; k++) {
          const u = (arc.particleOffsets[k] + t * speed) % 1;
          const p = arc.curve.getPoint(u);
          posAttr.setXYZ(k, p.x, p.y, p.z);
        }
        posAttr.needsUpdate = true;
      }

      // Zoom-driven label visibility + city dot scaling
      const z = camera.position.z;
      const showCountries = z >= 5.5;
      const showCities = z < 6.2;
      const showDistricts = z < 4.4;
      // Dots scale DOWN slightly as you zoom in (closer camera = smaller dots)
      const dotScale = THREE.MathUtils.clamp(0.6 + (z - 3.5) * 0.12, 0.6, 1.2);
      markers.forEach((m) => m.mesh.scale.setScalar(dotScale));

      const w = renderer.domElement.clientWidth;
      const h = renderer.domElement.clientHeight;
      labelEls.forEach(({ def, el }) => {
        const localPos = latLngToVec3(def.lat, def.lng, radius * 1.04);
        tmpVec.copy(localPos).applyMatrix4(globeGroup.matrixWorld);
        const camDir = camera.position.clone().normalize();
        const facing = tmpVec.clone().normalize().dot(camDir);
        const projected = tmpVec.clone().project(camera);
        const x = (projected.x * 0.5 + 0.5) * w;
        const y = (-projected.y * 0.5 + 0.5) * h;
        const tierVisible =
          (def.tier === 1 && showCountries) ||
          (def.tier === 2 && showCities) ||
          (def.tier === 3 && showDistricts);
        const visible = facing > 0.15 && tierVisible && projected.z < 1;
        el.style.left = `${x}px`;
        el.style.top = `${y - (def.tier === 2 ? 14 : 0)}px`;
        el.style.opacity = visible ? (def.tier === 1 ? "0.55" : "0.95") : "0";
      });

      // Region detection from globe Y-rotation
      const ry = ((globeGroup.rotation.y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const facingLng = (((-ry * 180) / Math.PI + 180 + 540) % 360) - 180;
      let region: GlobeRegion = "asia";
      if (facingLng >= 60 && facingLng < 150) region = "asia";
      else if (facingLng >= -30 && facingLng < 60) region = "europe";
      else if (facingLng >= 110 || facingLng < -150) region = "oceania";
      else region = "americas";
      if (region !== lastRegion) {
        lastRegion = region;
        onRegionChangeRef.current?.(region);
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    return () => {
      borderCancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.dispose();
      sphereGeo.dispose();
      wireGeo.dispose();
      haloGeo.dispose();
      dotGeo.dispose();
      mount.removeChild(renderer.domElement);
      labelEls.forEach(({ el }) => el.parentElement?.removeChild(el));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, showArcs]);

  return (
    <div ref={mountRef} style={{ position: "relative", width: "100%", height: heightStyle }}>
      <div
        ref={labelLayerRef}
        style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}
      />
    </div>
  );
});
