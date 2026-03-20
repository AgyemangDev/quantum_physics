"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

interface Props {
  x0: number;
  sigma: number;
  k0: number;
  height?: number;
}

export default function WireframeScene({ x0, sigma, k0, height = 300 }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth || 600;
    const H = height;

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x03086b, 1);
    mount.appendChild(renderer.domElement);

    // ── Scene & Camera ────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 200);
    camera.position.set(22, 13, 18);
    camera.lookAt(0, 0.5, 0);

    // ── Wave functions ────────────────────────────────────────────────────────
    const NX = 90;
    const NY = 32;
    const rangeX = 10;
    const rangeY = 4.5;
    const zScale = 3.2;

    const env   = (wx: number, wy: number) =>
      Math.exp(-((wx - x0) ** 2 + wy ** 2) / (4 * sigma ** 2));
    const reVal = (wx: number, wy: number) => Math.cos(k0 * wx) * env(wx, wy);
    const imVal = (wx: number, wy: number) => Math.sin(k0 * wx) * env(wx, wy);

    // ── Build wireframe LineSegments ──────────────────────────────────────────
    const buildSurface = (fn: (wx: number, wy: number) => number) => {
      const pts: number[] = [];
      // Lines along x (the oscillation stripes — dense)
      for (let iy = 0; iy <= NY; iy++) {
        const wy = -rangeY + (iy / NY) * 2 * rangeY;
        for (let ix = 0; ix < NX; ix++) {
          const wx1 = -rangeX + (ix / NX) * 2 * rangeX;
          const wx2 = -rangeX + ((ix + 1) / NX) * 2 * rangeX;
          pts.push(wx1, fn(wx1, wy) * zScale, wy);
          pts.push(wx2, fn(wx2, wy) * zScale, wy);
        }
      }
      // Lines along y (cross-sections — sparse)
      for (let ix = 0; ix <= NX; ix += 3) {
        const wx = -rangeX + (ix / NX) * 2 * rangeX;
        for (let iy = 0; iy < NY; iy++) {
          const wy1 = -rangeY + (iy / NY) * 2 * rangeY;
          const wy2 = -rangeY + ((iy + 1) / NY) * 2 * rangeY;
          pts.push(wx, fn(wx, wy1) * zScale, wy1);
          pts.push(wx, fn(wx, wy2) * zScale, wy2);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      return geo;
    };

    // ── Re(ψ) — yellow (matches reference image exactly) ─────────────────────
    const reGeo = buildSurface(reVal);
    const reMat = new THREE.LineBasicMaterial({ color: 0xf5d000, transparent: true, opacity: 0.95 });
    scene.add(new THREE.LineSegments(reGeo, reMat));

    // ── Im(ψ) — magenta/pink (the "shadow" surface in reference) ─────────────
    // Slightly offset in y so both surfaces are clearly distinct
    const imGeo = buildSurface(imVal);
    const imMat = new THREE.LineBasicMaterial({ color: 0xff2299, transparent: true, opacity: 0.75 });
    const imMesh = new THREE.LineSegments(imGeo, imMat);
    imMesh.position.y = -0.15; // tiny offset so they don't z-fight
    scene.add(imMesh);

    // ── Magenta curtain (vertical lines from zero-plane to Im surface) ────────
    // This is the pink "skirt" visible at the bottom of the reference image
    const curtainPts: number[] = [];
    for (let ix = 0; ix <= NX; ix += 2) {
      const wx = -rangeX + (ix / NX) * 2 * rangeX;
      // sample at y = 0 (centre of the y range)
      const iz = imVal(wx, 0) * zScale;
      curtainPts.push(wx, 0, 0, wx, iz, 0);
    }
    const curtainGeo = new THREE.BufferGeometry();
    curtainGeo.setAttribute("position", new THREE.Float32BufferAttribute(curtainPts, 3));
    const curtainMat = new THREE.LineBasicMaterial({ color: 0xff00cc, transparent: true, opacity: 0.4 });
    scene.add(new THREE.LineSegments(curtainGeo, curtainMat));

    // ── Zero-plane (white grid, like reference) ───────────────────────────────
    const gridPts: number[] = [];
    const GX = 40, GY = 18;
    for (let ix = 0; ix <= GX; ix++) {
      const wx = -rangeX + (ix / GX) * 2 * rangeX;
      gridPts.push(wx, 0, -rangeY, wx, 0, rangeY);
    }
    for (let iy = 0; iy <= GY; iy++) {
      const wy = -rangeY + (iy / GY) * 2 * rangeY;
      gridPts.push(-rangeX, 0, wy, rangeX, 0, wy);
    }
    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute("position", new THREE.Float32BufferAttribute(gridPts, 3));
    scene.add(new THREE.LineSegments(gridGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 })));

    // ── Axes ──────────────────────────────────────────────────────────────────
    const axPts: number[] = [
      // x
      -rangeX, 0, -rangeY,  rangeX + 1.5, 0, -rangeY,
      // vertical (Re amplitude)
      -rangeX, -0.5, -rangeY,  -rangeX, zScale + 0.5, -rangeY,
      // y (depth)
      -rangeX, 0, -rangeY,  -rangeX, 0, rangeY + 1,
    ];
    const axGeo = new THREE.BufferGeometry();
    axGeo.setAttribute("position", new THREE.Float32BufferAttribute(axPts, 3));
    scene.add(new THREE.LineSegments(axGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })));

    // Arrowheads
    const arrow = (from: THREE.Vector3, to: THREE.Vector3, color: number) => {
      const dir = to.clone().sub(from).normalize();
      const head = new THREE.ConeGeometry(0.08, 0.35, 8);
      const mat  = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(head, mat);
      mesh.position.copy(to);
      const up = new THREE.Vector3(0, 1, 0);
      const q  = new THREE.Quaternion().setFromUnitVectors(up, dir);
      mesh.quaternion.copy(q);
      scene.add(mesh);
    };
    arrow(new THREE.Vector3(-rangeX, 0, -rangeY), new THREE.Vector3(rangeX + 1.5, 0, -rangeY), 0xffffff);
    arrow(new THREE.Vector3(-rangeX, 0, -rangeY), new THREE.Vector3(-rangeX, zScale + 0.5, -rangeY), 0xffffff);
    arrow(new THREE.Vector3(-rangeX, 0, -rangeY), new THREE.Vector3(-rangeX, 0, rangeY + 1), 0xffffff);

    // ── Canvas labels ─────────────────────────────────────────────────────────
    const makeSprite = (text: string, color = "rgba(255,255,255,0.85)", size = 16) => {
      const c = document.createElement("canvas");
      c.width = 160; c.height = 40;
      const cx = c.getContext("2d")!;
      cx.fillStyle = color;
      cx.font = `${size}px 'Space Mono', monospace`;
      cx.fillText(text, 4, 26);
      const tex = new THREE.CanvasTexture(c);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
      const sp  = new THREE.Sprite(mat);
      sp.scale.set(3.5, 0.9, 1);
      return sp;
    };

    const lX = makeSprite("x");
    lX.position.set(rangeX + 2.5, 0.3, -rangeY);
    scene.add(lX);

    const lY = makeSprite("y");
    lY.position.set(-rangeX - 0.4, 0.3, rangeY + 1.5);
    scene.add(lY);

    const lRe = makeSprite("Re{ψ(x,y)}", "rgba(255,255,255,0.8)", 14);
    lRe.position.set(-rangeX - 2, zScale + 0.8, -rangeY);
    scene.add(lRe);

    const lT = makeSprite("t = 0", "rgba(255,255,255,0.7)", 14);
    lT.position.set(-rangeX + 1, zScale + 1.3, rangeY - 1);
    scene.add(lT);

    // ── Slow auto-rotation ────────────────────────────────────────────────────
    let animId: number;
    let angle = Math.PI * 0.18; // start at the reference image angle
    const R = 30;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      angle += 0.0025;
      camera.position.set(
        Math.sin(angle) * R,
        13,
        Math.cos(angle) * R * 0.75
      );
      camera.lookAt(0, 0.5, 0);
      renderer.render(scene, camera);
    };
    animate();

    // ── Resize ────────────────────────────────────────────────────────────────
    const onResize = () => {
      const w = mount.clientWidth;
      renderer.setSize(w, H);
      camera.aspect = w / H;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      [reGeo, imGeo, curtainGeo, gridGeo, axGeo].forEach(g => g.dispose());
      [reMat, imMat, curtainMat].forEach(m => m.dispose());
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [x0, sigma, k0, height]);

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={mountRef}
        style={{ width: "100%", height, borderRadius: 6, overflow: "hidden" }}
      />
      {/* Legend */}
      <div style={{
        position: "absolute", top: 10, right: 12,
        display: "flex", flexDirection: "column", gap: 5,
        fontSize: 10, fontFamily: "'Space Mono', monospace",
        color: "rgba(255,255,255,0.75)",
        background: "rgba(3,8,107,0.6)",
        padding: "6px 10px", borderRadius: 5,
        backdropFilter: "blur(4px)",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 20, height: 2, background: "#f5d000", display: "inline-block" }} />
          Re(ψ)
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 20, height: 2, background: "#ff2299", display: "inline-block" }} />
          Im(ψ) — 90° phase shift
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.3)" }}>
          <span style={{ width: 20, height: 2, background: "rgba(255,255,255,0.2)", display: "inline-block" }} />
          zero-plane
        </span>
      </div>
      <div style={{ position: "absolute", bottom: 6, left: 10, fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Mono', monospace" }}>
        auto-rotating · k₀ = {k0} · σ = {sigma}
      </div>
    </div>
  );
}