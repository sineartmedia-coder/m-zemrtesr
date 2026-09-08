"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildPalace } from "./palace";

const collection = (room: string, ids: number[]) =>
  ids.map((id) => "/museum/" + room + "/" + String(id).padStart(2, "0") + ".jpg");

const COLLECTIONS = {
  main:   collection("ana-salon",   [1, 2, 3, 4, 6, 7, 9, 10]),
  pets:   collection("patili-oda",  [1, 3, 5, 7, 9, 11, 17, 20, 24, 28]),
  love:   collection("sevgi-odasi", [1, 2, 4, 6, 8, 10, 12, 14, 17, 19]),
  gaffur: collection("gaffur-odasi",[1, 2, 3, 5, 6, 8, 9, 10, 12, 14]),
  tunnel: collection("ask-tuneli",  [1, 2, 4, 5, 7, 8, 10, 11, 13, 15]),
  final:  "/museum/buyuk-oda/01.jpg",
};

type Room = { xMin: number; xMax: number; zMin: number; zMax: number; floorY: number; height: number };
type Openings = { north?: number[][]; south?: number[][]; west?: number[][]; east?: number[][] };

// ─── Rooms ───────────────────────────────────────────────────────────────────
// Entrance + Main Hall geometry is built by palace.ts; these are the side rooms.
const ROOMS = {
  cafe:      { xMin: -36, xMax: -14, zMin:  3, zMax: 13, floorY: 1.5, height: 8.5 } as Room,
  toilets:   { xMin:  14, xMax:  36, zMin:  3, zMax: 13, floorY: 1.5, height: 8.5 } as Room,
  love:      { xMin: -36, xMax: -14, zMin:-10, zMax:  0, floorY: 1.5, height: 8.5 } as Room,
  special:   { xMin:  14, xMax:  36, zMin:-10, zMax:  0, floorY: 1.5, height: 8.5 } as Room,
  pets:      { xMin: -36, xMax: -14, zMin:-22, zMax:-12, floorY: 1.5, height: 8.5 } as Room,
  gaffur:    { xMin:  14, xMax:  36, zMin:-22, zMax:-12, floorY: 1.5, height: 8.5 } as Room,
  tunnel:    { xMin:  -4, xMax:   4, zMin:-71, zMax: -7, floorY: 1.5, height: 7.5 } as Room,
  finalRoom: { xMin:  -7, xMax:   7, zMin:-95, zMax:-71, floorY: 1.5, height: 16.0 } as Room,
};

export default function Home() {
  const mountRef  = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keys      = useRef(new Set<string>());
  const [entered, setEntered] = useState(false);
  const [locked,  setLocked]  = useState(false);
  const [zone,    setZone]    = useState("GİRİŞ");
  const enteredRef = useRef(false);
  const isMobile = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;

  useEffect(() => { enteredRef.current = entered; }, [entered]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Scene & Renderer ──────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030201);
    scene.fog = new THREE.FogExp2(0x030201, .006);

    const camera = new THREE.PerspectiveCamera(68, mount.clientWidth / mount.clientHeight, .06, 160);
    camera.position.set(0, 1.72, 29);
    camera.rotation.order = "YXZ";

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.75;  // Darker overall exposure
    mount.appendChild(renderer.domElement);
    canvasRef.current = renderer.domElement;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const env   = pmrem.fromScene(new RoomEnvironment(), .04);
    scene.environment = env.texture;
    scene.environmentIntensity = .12;  // Very low ambient from env
    pmrem.dispose();

    // ── Materials ─────────────────────────────────────────────────────────
    const marbleTex = makeMarbleTexture();
    marbleTex.wrapS = marbleTex.wrapT = THREE.RepeatWrapping;
    marbleTex.repeat.set(4, 4);
    const floorMat = new THREE.MeshStandardMaterial({ map: marbleTex, roughness: .28, metalness: .06 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xc99c53, roughness: .15, metalness: .95 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x1c100a, roughness: .4,  metalness: .1  });

    // Per-room wall colours matching reference image
    const W = {
      default: mat(0xd8d2c8),
      cafe:    mat(0x2a2318),
      pets:    mat(0x1b2f3a),
      love:    mat(0x5c1118),
      gaffur:  mat(0x1c2430),
      special: mat(0x1e2430),
      tunnel:  mat(0x1a1e24),
      final:   mat(0x241d1a),
    };

    // ── Global ambient ────────────────────────────────────────────────────
    scene.add(new THREE.HemisphereLight(0xfff5e0, 0x080a0f, 0.38));

    // ── Palace (entrance + main hall) ─────────────────────────────────────
    buildPalace(scene, renderer, COLLECTIONS.main);

    // ── Side rooms ────────────────────────────────────────────────────────
    const { cafe, toilets, love, special, pets, gaffur, tunnel, finalRoom } = ROOMS;

    addRoom(scene, cafe,      { east: [[8,  3]] },           floorMat, W.default, gold);
    addRoom(scene, toilets,   { west: [[8,  3]] },           floorMat, W.default, gold);
    addRoom(scene, love,      { east: [[-5, 3]] },           floorMat, W.love,    gold);
    addRoom(scene, special,   { west: [[-5, 3]] },           floorMat, W.special, gold);
    addRoom(scene, pets,      { east: [[-17, 3.5]] },        floorMat, W.pets,    gold);
    addRoom(scene, gaffur,    { west: [[-17, 3.5]] },        floorMat, W.gaffur,  gold);
    addRoom(scene, tunnel,    { north:[[0,6]], south:[[0,7]], west:[[-17,3.5]], east:[[-17,3.5]] }, floorMat, W.tunnel, gold);
    addRoom(scene, finalRoom, { south: [[0, 6]] },           floorMat, W.final,   gold);

    // ── Connector hallways (pets/gaffur ↔ tunnel) ─────────────────────────
    addConnector(scene, -9,  -17, 10, 3.5, 1.5, floorMat, W.default);
    addConnector(scene,  9,  -17, 10, 3.5, 1.5, floorMat, W.default);

    // ── Doors at all entrances ──────────────────────────────────────────────
    // Main Hall side rooms (Arch width 3.0, height 5.7)
    addDoubleDoors(scene, -13.65,   8,  Math.PI/2, 1.5, 3.0, 5.7, wood, gold); // Cafe
    addDoubleDoors(scene,  13.65,   8, -Math.PI/2, 1.5, 3.0, 5.7, wood, gold); // Toilets
    addDoubleDoors(scene, -13.65,  -5,  Math.PI/2, 1.5, 3.0, 5.7, wood, gold); // Love
    addDoubleDoors(scene,  13.65,  -5, -Math.PI/2, 1.5, 3.0, 5.7, wood, gold); // Special
    // Tunnel side rooms (Connector width 3.5, height 5.3)
    addDoubleDoors(scene,  -4.0,  -17,  Math.PI/2, 1.5, 3.5, 5.3, wood, gold); // Pets
    addDoubleDoors(scene,   4.0,  -17, -Math.PI/2, 1.5, 3.5, 5.3, wood, gold); // Gaffur
    // Final Room (half-open doors, width 8.0, height 7.5)
    addDoubleDoors(scene, 0, -71, 0, 1.5, 8.0, 7.5, wood, gold, true); // half-open

    // ── Room lights ───────────────────────────────────────────────────────
    addRoomPointLights(scene, cafe,    W.cafe.color.getHex());
    addRoomPointLights(scene, toilets, 0xffecd5);
    addRoomPointLights(scene, love,    0xffd5b8);
    addRoomPointLights(scene, special, 0xffd5b8);
    addRoomPointLights(scene, pets,    0xffe0c0);
    addRoomPointLights(scene, gaffur,  0xffe0c0);
    addTunnelLights(scene, tunnel);
    addFinalRoomLights(scene, finalRoom);

    // ── Furniture & decor ─────────────────────────────────────────────────
    addGalleryDecor(scene, pets,      "left",  wood, gold);
    addGalleryDecor(scene, love,      "left",  wood, gold);
    addGalleryDecor(scene, gaffur,    "right", wood, gold);
    addGalleryDecor(scene, special,   "right", wood, gold);
    addFinalDecor(scene, finalRoom,   wood, gold);
    addCafeDecor(scene, cafe,         wood, gold);
    addTunnelDecor(scene, tunnel,     wood, gold);
    // Toilet decor: simple dividers only, no floating boxes
    addBox(scene, 7.0, .2, .55, 25, toilets.floorY + 2.35, 3.5, gold);

    // ── Artwork ───────────────────────────────────────────────────────────
    const loader = new THREE.TextureLoader();

    // Side-room galleries: paintings on 3 walls, correct wall positions
    addSideGallery(scene, loader, COLLECTIONS.pets,   pets,   "left",  gold);
    addSideGallery(scene, loader, COLLECTIONS.love,   love,   "left",  gold);
    addSideGallery(scene, loader, COLLECTIONS.gaffur, gaffur, "right", gold);

    // Tunnel: alternating left/right paintings
    addTunnelGallery(scene, loader, COLLECTIONS.tunnel, tunnel, gold);

    // Final masterpiece – fills the far wall, 1.5 from floor
    const fh_wall = finalRoom.height - 1.0;  // ~15 units tall, nearly floor-to-ceiling
    const fcy = finalRoom.floorY + fh_wall / 2 + 1.5; // centered leaving 1.5 gap at bottom
    addArtwork(scene, loader, COLLECTIONS.final, 0, finalRoom.zMin + 1.05, 0, 13.5, fcy, finalRoom.floorY, false, true);

    // ── Room labels (at first entrances) ────────────────────────────────────
    addLabel(scene, "GÜVENLİK KONTROL ALANI", 0,  5.5, 32.7, Math.PI,      5.5);
    addLabel(scene, "ANA SALON",              0,  6.8, 12.7, Math.PI,      4.5);
    
    // Main Hall side rooms
    addLabel(scene, "KAFETERYA",   -13.65, 6.5,   8,  Math.PI/2,  4.0);
    addLabel(scene, "TUVALETLER",   13.65, 6.5,   8, -Math.PI/2,  4.0);
    addLabel(scene, "SEVGİ ODASI", -13.65, 6.5,  -5,  Math.PI/2,  4.0);
    addLabel(scene, "ÖZEL ODA",     13.65, 6.5,  -5, -Math.PI/2,  4.0);
    // Tunnel side rooms (Labels at the tunnel entrance, not inside the room)
    addLabel(scene, "PATİLİ ODA",   -4.0,  6.0, -17,  Math.PI/2,  4.0);
    addLabel(scene, "GAFFUR ODASI",  4.0,  6.0, -17, -Math.PI/2,  4.0);
    
    // Tunnel & Final Room
    addLabel(scene, "AŞK TÜNELİ",        0, 8.2,  -8.1, 0, 4.5);
    addLabel(scene, "ÖZEL ODA · FİNAL",  0, 8.2, -70.9, 0, 4.5);

    // Final room side walls – romantic gold text
    const frMidZ = (finalRoom.zMin + finalRoom.zMax) / 2;
    addLabel(scene, "ESRA ♥ MERT",          finalRoom.xMin + 0.55, 5.0, frMidZ,  Math.PI/2,  4.5, true);
    addLabel(scene, "SENİ SEVİYORUM AŞKIM", finalRoom.xMax - 0.55, 5.0, frMidZ, -Math.PI/2,  4.5, true);



    // ── Input & pointer lock ──────────────────────────────────────────────
    let yaw = 0, pitch = 0, touchX = 0, touchY = 0, touching = false;
    const mouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== renderer.domElement) return;
      yaw   -= e.movementX * .0022;
      pitch  = Math.max(-1.08, Math.min(1.08, pitch - e.movementY * .00185));
    };
    const lockChange = () => setLocked(document.pointerLockElement === renderer.domElement);
    const clickCanvas = () => {
      if (enteredRef.current && document.pointerLockElement !== renderer.domElement)
        renderer.domElement.requestPointerLock()?.catch(() => {});
    };
    const touchStart = (e: PointerEvent) => { if (e.pointerType === "touch") { touching = true; touchX = e.clientX; touchY = e.clientY; } };
    const touchLook  = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || !touching) return;
      yaw   -= (e.clientX - touchX) * .006;
      pitch  = Math.max(-1.05, Math.min(1.05, pitch - (e.clientY - touchY) * .004));
      touchX = e.clientX; touchY = e.clientY;
    };
    const touchEnd = () => { touching = false; };
    document.addEventListener("mousemove",      mouseMove);
    document.addEventListener("pointerlockchange", lockChange);
    renderer.domElement.addEventListener("click",       clickCanvas);
    renderer.domElement.addEventListener("pointerdown", touchStart);
    renderer.domElement.addEventListener("pointermove", touchLook);
    renderer.domElement.addEventListener("pointerup",   touchEnd);
    renderer.domElement.addEventListener("pointercancel", touchEnd);

    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright","shift"].includes(k)) { e.preventDefault(); keys.current.add(k); }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup",   up);

    // ── Animation loop ────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    let frame = 0, zoneTimer = 0;
    const blur = () => keys.current.clear();
    window.addEventListener("blur", blur);

    const animate = () => {
      frame = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), .035);
      if (enteredRef.current) {
        let fw = 0, st = 0;
        if (keys.current.has("w") || keys.current.has("arrowup"))    fw += 1;
        if (keys.current.has("s") || keys.current.has("arrowdown"))  fw -= 1;
        if (keys.current.has("d") || keys.current.has("arrowright")) st += 1;
        if (keys.current.has("a") || keys.current.has("arrowleft"))  st -= 1;
        if (fw || st) {
          const len = Math.hypot(fw, st);
          const spd = (keys.current.has("shift") ? 10.2 : 7.4) * dt;
          const nx = camera.position.x + (-Math.sin(yaw) * fw / len + Math.cos(yaw) * st / len) * spd;
          const nz = camera.position.z + (-Math.cos(yaw) * fw / len - Math.sin(yaw) * st / len) * spd;
          if (isWalkable(nx, camera.position.z)) camera.position.x = nx;
          if (isWalkable(camera.position.x, nz)) camera.position.z = nz;
        }
      }
      camera.position.y = getCameraHeight(camera.position.z);
      camera.rotation.y = yaw;
      camera.rotation.x = pitch;
      zoneTimer += dt;
      if (zoneTimer > .35) { zoneTimer = 0; setZone(getZone(camera.position.x, camera.position.z)); }
      renderer.render(scene, camera);
    };
    animate();

    const resize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup",   up);
      window.removeEventListener("blur",    blur);
      document.removeEventListener("mousemove",         mouseMove);
      document.removeEventListener("pointerlockchange", lockChange);
      renderer.domElement.removeEventListener("click",        clickCanvas);
      renderer.domElement.removeEventListener("pointerdown",  touchStart);
      renderer.domElement.removeEventListener("pointermove",  touchLook);
      renderer.domElement.removeEventListener("pointerup",    touchEnd);
      renderer.domElement.removeEventListener("pointercancel",touchEnd);
      renderer.dispose();
      marbleTex.dispose();
      env.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  const enter = () => {
    setEntered(true);
    if (window.matchMedia("(pointer: fine)").matches) canvasRef.current?.requestPointerLock()?.catch(() => {});
  };
  const hold = (key: string, active: boolean) => active ? keys.current.add(key) : keys.current.delete(key);

  return (
    <main className="museum-game">
      <div className="orientation-lock">Lütfen Telefonu Yan Çevirin</div>
      <div ref={mountRef} className="three-stage" />
      <div className="game-vignette" />
      <header className="game-header"><span className="brand">HK</span><span>RESİM MÜZESİ</span><b>{zone}</b></header>
      {!isMobile && <div className="crosshair"><i /></div>}
      {!isMobile && <div className="status"><span /> SERGİ AÇIK <b>/</b> 7 GALERİ · 49 ESER</div>}
      {!isMobile && <div className="key-help"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>HAREKET</span><i /><kbd>⇧</kbd><span>HIZLI YÜRÜ</span><i />FARE<span>BAKIŞ</span></div>}
      {isMobile && (
        <nav style={{display:"flex",flexDirection:"column",gap:"14px",position:"absolute",zIndex:8,left:"14px",top:"50%",transform:"translateY(-50%)",touchAction:"none"}} aria-label="Hareket kontrolleri">
          <button style={{width:"64px",height:"64px",border:"2px solid rgba(255,255,255,0.45)",borderRadius:"50%",background:"rgba(0,0,0,0.25)",color:"rgba(255,255,255,0.9)",fontSize:"26px",display:"flex",alignItems:"center",justifyContent:"center",touchAction:"none",backdropFilter:"blur(6px)"}} onPointerDown={()=>hold("w",true)} onPointerUp={()=>hold("w",false)} onPointerLeave={()=>hold("w",false)} onPointerCancel={()=>hold("w",false)}>▲</button>
          <button style={{width:"64px",height:"64px",border:"2px solid rgba(255,255,255,0.45)",borderRadius:"50%",background:"rgba(0,0,0,0.25)",color:"rgba(255,255,255,0.9)",fontSize:"26px",display:"flex",alignItems:"center",justifyContent:"center",touchAction:"none",backdropFilter:"blur(6px)"}} onPointerDown={()=>hold("s",true)} onPointerUp={()=>hold("s",false)} onPointerLeave={()=>hold("s",false)} onPointerCancel={()=>hold("s",false)}>▼</button>
        </nav>
      )}
      {!entered && (
        <section className="welcome">
          <div className="welcome-art" />
          <div className="welcome-content">
            <p>KLASİK AVRUPA KOLEKSİYONU</p>
            <h1><span>RESİM</span><em>MÜZESİ</em></h1>
            <div className="welcome-rule"><i />SANAT, HER ADIMDA SİZİ FARKLI BİR DÜNYAYA TAŞIR<i /></div>
            <button onClick={enter}>MÜZEYE GİR <b>↗</b></button>
            <small>WASD ile yürü · Shift ile hızlan · Fareyle etrafına bak</small>
          </div>
        </section>
      )}
    </main>
  );
}

// ─── Helper: material ────────────────────────────────────────────────────────
function mat(color: number) {
  return new THREE.MeshStandardMaterial({ color, roughness: .82, metalness: .02 });
}

// ─── Navigation helpers ───────────────────────────────────────────────────────
function isWalkable(x: number, z: number) {
  const r = .52;
  const rect = (x1:number,x2:number,z1:number,z2:number) => x>x1+r && x<x2-r && z>z1+r && z<z2-r;
  const thin = (x1:number,x2:number,z1:number,z2:number) => x>x1 && x<x2 && z>z1 && z<z2;
  // Stair column guard
  if (z > 13 && z < 20.1 && Math.abs(x) > 3.75) return false;
  return (
    rect(-10, 10, 13, 33) ||                          // entrance
    rect(-14, 14, -7, 13) ||                          // main hall
    rect(-36,-14, 3, 13) || rect(14, 36, 3, 13) ||    // cafe / toilets
    rect(-36,-14,-10,  0) || rect(14, 36,-10,  0) ||  // love / special
    rect(-36,-14,-22,-12) || rect(14, 36,-22,-12) ||  // pets / gaffur
    rect( -4,  4,-71, -7) ||                          // tunnel
    rect( -7,  7,-95,-71) ||                          // final room
    // Connectors pets↔tunnel and gaffur↔tunnel
    thin(-14.6, -3.4,-18.75,-15.25) || thin(3.4, 14.6,-18.75,-15.25) ||
    // Door thresholds
    thin( -3,  3, 12.4, 13.6) ||
    thin(-14.6,-13.4, 5.5, 8.5) || thin(13.4, 14.6, 5.5, 8.5) ||
    thin(-14.6,-13.4,-6.5,-3.5) || thin(13.4, 14.6,-6.5,-3.5) ||
    thin( -3.5, 3.5,-7.6,-6.4) || thin(-3, 3,-71.6,-70.4)
  );
}

function getCameraHeight(z: number) {
  if (z >= 20) return 1.72;
  if (z <= 13) return 3.22;
  return 1.72 + ((20 - z) / 7) * 1.5;
}

function getZone(x: number, z: number) {
  if (z >  20)              return "GÜVENLİK · GİRİŞ";
  if (z >  13)              return "ANITSAL MERDİVEN";
  if (z < -71)              return "ÖZEL ODA · FİNAL";
  if (Math.abs(x) < 4.5 && z < -7) return "AŞK TÜNELİ";
  if (x < -14 && z < -12)  return "PATİLİ ODA";
  if (x >  14 && z < -12)  return "GAFFUR ODASI";
  if (x < -14 && z <   0)  return "SEVGİ ODASI";
  if (x >  14 && z <   0)  return "ÖZEL ODA";
  if (x < -14)              return "KAFETERYA";
  if (x >  14)              return "TUVALETLER";
  return "ANA SALON";
}

// ─── Room Builder ─────────────────────────────────────────────────────────────
function addRoom(scene: THREE.Scene, room: Room, openings: Openings, floor: THREE.Material, wall: THREE.Material, trim: THREE.Material) {
  const w = room.xMax - room.xMin, d = room.zMax - room.zMin;
  const cx = (room.xMin + room.xMax) / 2, cz = (room.zMin + room.zMax) / 2;
  addFloor(scene, w, d, cx, room.floorY, cz, floor);
  addCeiling(scene, w, d, cx, room.floorY + room.height, cz);
  // Shift walls inward by 0.5 units to prevent z-fighting with palace.ts thick walls
  const IN = 0.5;
  addWallRun(scene, "x", room.zMin + IN, room.xMin, room.xMax, room.floorY, room.height, openings.north || [], wall, trim);
  addWallRun(scene, "x", room.zMax - IN, room.xMin, room.xMax, room.floorY, room.height, openings.south || [], wall, trim);
  addWallRun(scene, "z", room.xMin + IN, room.zMin, room.zMax, room.floorY, room.height, openings.west  || [], wall, trim);
  addWallRun(scene, "z", room.xMax - IN, room.zMin, room.zMax, room.floorY, room.height, openings.east  || [], wall, trim);
}

function addWallRun(scene: THREE.Scene, axis: "x"|"z", fixed: number, start: number, end: number, floorY: number, height: number, openings: number[][], wall: THREE.Material, trim: THREE.Material) {
  const gaps = openings.map(o => [o[0] - o[1]/2, o[0] + o[1]/2]).sort((a,b) => a[0]-b[0]);
  let cursor = start;
  gaps.concat([[end, end]]).forEach(gap => {
    if (gap[0] > cursor) {
      const length = gap[0] - cursor, center = (cursor + gap[0]) / 2;
      const th = 1.0; // Make walls 1.0 thick so they deeply intersect and bridge any gaps seamlessly
      if (axis === "x") {
        addBox(scene, length, height, th,  center, floorY + height/2, fixed, wall);
        addBox(scene, length, .1,    th+.1,  center, floorY + .18,      fixed, trim);
        addBox(scene, length, .1,    th+.1,  center, floorY+height-.18, fixed, trim);
      } else {
        addBox(scene, th,  height, length, fixed, floorY + height/2, center, wall);
        addBox(scene, th+.1,  .1,    length, fixed, floorY + .18,      center, trim);
        addBox(scene, th+.1,  .1,    length, fixed, floorY+height-.18, center, trim);
      }
    }
    cursor = Math.max(cursor, gap[1]);
  });
}

function addConnector(scene: THREE.Scene, x: number, z: number, w: number, d: number, y: number, floor: THREE.Material, wall: THREE.Material) {
  addFloor(scene, w, d, x, y, z, floor);
  addCeiling(scene, w, d, x, y + 5.3, z);
  addBox(scene, w, 5.3, .26, x, y + 2.65, z - d/2, wall);
  addBox(scene, w, 5.3, .26, x, y + 2.65, z + d/2, wall);
}

function addFloor(scene: THREE.Scene, w: number, d: number, x: number, y: number, z: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  scene.add(mesh);
}

function addCeiling(scene: THREE.Scene, w: number, d: number, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: 0xe8e2d8, roughness: .88 }));
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  scene.add(mesh);
}

function addBox(scene: THREE.Scene, w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function addDoubleDoors(scene: THREE.Scene, x: number, z: number, ry: number, floorY: number, width: number, height: number, wood: THREE.Material, gold: THREE.Material, halfOpen = false) {
  const g = new THREE.Group();
  g.position.set(x, floorY, z);
  g.rotation.y = ry;
  
  const fw = .34; // frame thickness
  const f1 = new THREE.Mesh(new THREE.BoxGeometry(fw, height, .5), gold); f1.position.set(-width/2 + fw/2, height/2, 0); g.add(f1);
  const f2 = new THREE.Mesh(new THREE.BoxGeometry(fw, height, .5), gold); f2.position.set( width/2 - fw/2, height/2, 0); g.add(f2);
  const f3 = new THREE.Mesh(new THREE.BoxGeometry(width, .3, .5), gold);  f3.position.set(0, height - .15, 0); g.add(f3);

  // ── Transom window above the door (closes the gap to ceiling) ─────────────
  const wallClearance = 3.0; // extra height above door frame to fill with glass
  const glassMats = [
    new THREE.MeshStandardMaterial({ color: 0x1a3a5c, transparent: true, opacity: .55, roughness: .1, metalness: .4 }),
    new THREE.MeshStandardMaterial({ color: 0x5c1a1a, transparent: true, opacity: .55, roughness: .1, metalness: .4 }),
    new THREE.MeshStandardMaterial({ color: 0x2a5c1a, transparent: true, opacity: .55, roughness: .1, metalness: .4 }),
  ];
  // Divide the transom into 3 coloured panes
  const paneW = (width - fw * 2) / 3;
  for (let p = 0; p < 3; p++) {
    const px = -width/2 + fw + paneW * p + paneW/2;
    const pane = new THREE.Mesh(
      new THREE.BoxGeometry(paneW - .04, wallClearance - .1, .12),
      glassMats[p]
    );
    pane.position.set(px, height + wallClearance / 2, 0);
    g.add(pane);
    // Gold divider strip between panes
    if (p < 2) {
      const div = new THREE.Mesh(new THREE.BoxGeometry(.06, wallClearance, .14), gold);
      div.position.set(px + paneW/2, height + wallClearance / 2, 0);
      g.add(div);
    }
  }
  // Top frame of transom
  const topBar = new THREE.Mesh(new THREE.BoxGeometry(width, .22, .5), gold);
  topBar.position.set(0, height + wallClearance, 0);
  g.add(topBar);
  
  const leafW = (width - fw * 2) / 2;
  const leafH = height - .3;
  
  [-1, 1].forEach(side => {
    const hinge = new THREE.Group();
    hinge.position.set(side * (width/2 - fw/2), height/2 - .15, 0);
    hinge.rotation.y = side * (halfOpen ? -.7 : -1.4); // half or fully open
    
    // Wooden leaf
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(leafW, leafH, .16), wood);
    leaf.position.x = side * -leafW/2;
    leaf.castShadow = true;
    hinge.add(leaf);
    
    // Gold trims / panels (Altın varaklı detaylar)
    [1, -1].forEach(faceZ => {
      // Outer border
      const outerW = leafW * 0.8, outerH = leafH * 0.85;
      const t1 = new THREE.Mesh(new THREE.BoxGeometry(outerW, .06, .18), gold);
      t1.position.set(side * -leafW/2, outerH/2, faceZ * 0.03); hinge.add(t1);
      const t2 = new THREE.Mesh(new THREE.BoxGeometry(outerW, .06, .18), gold);
      t2.position.set(side * -leafW/2, -outerH/2, faceZ * 0.03); hinge.add(t2);
      const t3 = new THREE.Mesh(new THREE.BoxGeometry(.06, outerH, .18), gold);
      t3.position.set(side * -leafW/2 - outerW/2, 0, faceZ * 0.03); hinge.add(t3);
      const t4 = new THREE.Mesh(new THREE.BoxGeometry(.06, outerH, .18), gold);
      t4.position.set(side * -leafW/2 + outerW/2, 0, faceZ * 0.03); hinge.add(t4);
      
      // Inner panel border
      const innerW = leafW * 0.5, innerH = leafH * 0.7;
      const i1 = new THREE.Mesh(new THREE.BoxGeometry(innerW, .04, .19), gold);
      i1.position.set(side * -leafW/2, innerH/2, faceZ * 0.03); hinge.add(i1);
      const i2 = new THREE.Mesh(new THREE.BoxGeometry(innerW, .04, .19), gold);
      i2.position.set(side * -leafW/2, -innerH/2, faceZ * 0.03); hinge.add(i2);
      const i3 = new THREE.Mesh(new THREE.BoxGeometry(.04, innerH, .19), gold);
      i3.position.set(side * -leafW/2 - innerW/2, 0, faceZ * 0.03); hinge.add(i3);
      const i4 = new THREE.Mesh(new THREE.BoxGeometry(.04, innerH, .19), gold);
      i4.position.set(side * -leafW/2 + innerW/2, 0, faceZ * 0.03); hinge.add(i4);
    });
    
    // Door handle (Altın kulp)
    const handleGeo = new THREE.CylinderGeometry(.03, .03, .4, 12);
    const handleFront = new THREE.Mesh(handleGeo, gold);
    handleFront.position.set(side * -leafW * 0.85, 0, .14);
    hinge.add(handleFront);
    const handleBack = new THREE.Mesh(handleGeo, gold);
    handleBack.position.set(side * -leafW * 0.85, 0, -.14);
    hinge.add(handleBack);
    
    g.add(hinge);
  });
  scene.add(g);
}

// ─── Lighting helpers ─────────────────────────────────────────────────────────
function addRoomPointLights(scene: THREE.Scene, room: Room, color = 0xffcf85) {
  const cx = (room.xMin + room.xMax) / 2, cz = (room.zMin + room.zMax) / 2;
  const y = room.floorY + room.height - .5;
  const intensity = 45, range = 24;
  [[cx, cz], [cx - 6, cz - 2], [cx + 6, cz + 2]].forEach(([lx, lz]) => {
    const l = new THREE.PointLight(color, intensity, range, 2);
    l.position.set(lx, y, lz);
    scene.add(l);
    const fix = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 6), new THREE.MeshBasicMaterial({ color }));
    fix.position.set(lx, y - .1, lz);
    scene.add(fix);
  });
}

function addTunnelLights(scene: THREE.Scene, room: Room) {
  const cx = (room.xMin + room.xMax) / 2;
  const y  = room.floorY + room.height - .4;
  // Very dim ceiling bulbs – just barely visible, paintings provide main light
  for (let z = room.zMax - 4; z > room.zMin + 2; z -= 8) {
    const l = new THREE.PointLight(0xffa060, 8, 10, 2);
    l.position.set(cx, y, z);
    scene.add(l);
    const fix = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffa060 }));
    fix.position.set(cx, y - .08, z);
    scene.add(fix);
  }
  // Spotlights on each painting – warm RED/PINK for Aşk Tüneli
  const leftX  = room.xMin + 1.05;
  const rightX = room.xMax - 1.05;
  const safeZs = [-24, -34, -44, -54, -64];
  safeZs.forEach((pz, idx) => {
    const paintX = idx % 2 === 0 ? leftX : rightX;
    const tgtX   = idx % 2 === 0 ? leftX - .1 : rightX + .1;
    const spot = new THREE.SpotLight(0xff4466, 180, 14, Math.PI / 7, .4, 1.8);
    spot.position.set(paintX, y - .5, pz);
    spot.target.position.set(tgtX, room.floorY + 2.8, pz);
    spot.castShadow = false; // Disable shadows for performance
    scene.add(spot, spot.target);

  });
}

function addFinalRoomLights(scene: THREE.Scene, room: Room) {
  const cx = (room.xMin + room.xMax) / 2, fz = room.zMin + .5;
  const y  = room.floorY + room.height - .4; // Height is 16 now, so y is ~17.1
  // Fill lights
  [cx-4, cx, cx+4].forEach(lx => {
    const l = new THREE.PointLight(0xfffbf0, 100, 35, 2);
    l.position.set(lx, y - 2, (room.zMin + room.zMax) / 2);
    scene.add(l);
  });
  // Dramatic spotlights converging on the masterpiece
  [[-4, 0], [0, 0], [4, 0]].forEach(([ox]) => {
    const spot = new THREE.SpotLight(0xfff8e8, 300, 60, Math.PI / 6, .55, 1.5);
    spot.position.set(cx + ox, y - 1, room.zMin + 18);
    spot.target.position.set(cx, room.floorY + 6.0, fz);
    spot.castShadow = false;
    scene.add(spot, spot.target);
  });
  // Wide warm fill from behind viewer
  const fill = new THREE.PointLight(0xffe8cc, 80, 30, 2);
  fill.position.set(cx, room.floorY + 4, room.zMax - 2);
  scene.add(fill);
}

function addTunnelDecor(scene: THREE.Scene, room: Room, wood: THREE.Material, gold: THREE.Material) {
  const fy = room.floorY;
  const leftX  = room.xMin + 1.2;
  const rightX = room.xMax - 1.2;
  const stone = new THREE.MeshStandardMaterial({ color: 0xd5cfc4, roughness: .72 });

  // Paint pairs are at -24, -34, -44, -54, -64
  // Between them: -29, -39, -49, -59
  const midZs = [-29, -39, -49, -59];
  
  midZs.forEach((z, i) => {
    // Alternate sides for statues and planters
    if (i % 2 === 0) {
      addPedestal(scene, leftX, z, fy, stone);
      addPlanter(scene, rightX, z, fy, gold);
    } else {
      addPlanter(scene, leftX, z, fy, gold);
      addPedestal(scene, rightX, z, fy, stone);
    }
  });
}

// ─── Decor ────────────────────────────────────────────────────────────────────
function addGalleryDecor(scene: THREE.Scene, room: Room, side: "left"|"right", wood: THREE.Material, gold: THREE.Material) {
  const cx = (room.xMin + room.xMax) / 2, cz = (room.zMin + room.zMax) / 2;
  const fy = room.floorY;
  addBench(scene, cx, cz + 1, fy, 0, wood);
  // Corner planters (inset further so they don't overlap with painting ropes)
  addPlanter(scene, room.xMin + 1.6, room.zMin + 1.6, fy, gold);
  addPlanter(scene, room.xMax - 1.6, room.zMax - 1.6, fy, gold);
  // Statue on pedestal at far wall centre
  const stone = new THREE.MeshStandardMaterial({ color: 0xd5cfc4, roughness: .72 });
  addPedestal(scene, cx, room.zMin + 2.0, fy, stone);
}

function addFinalDecor(scene: THREE.Scene, room: Room, wood: THREE.Material, gold: THREE.Material) {
  const cx = (room.xMin + room.xMax) / 2, fy = room.floorY;
  addBench(scene, cx, room.zMin + 8, fy, 0, wood);
  addPlanter(scene, room.xMin + 1.5, room.zMin + 2.5, fy, gold);
  addPlanter(scene, room.xMax - 1.5, room.zMin + 2.5, fy, gold);
}

function addCafeDecor(scene: THREE.Scene, room: Room, wood: THREE.Material, gold: THREE.Material) {
  const fy = room.floorY;
  // Counter
  addBox(scene, 8, 1.1, 1.0, -17.5, fy + .55 + 1.1/2, 2.8, wood);
  // Round tables
  [[-30, 6.5], [-24, 6.5], [-30, 9.5], [-24, 9.5], [-18, 8.0]].forEach(([tx, tz]) => {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(.82, .82, .1, 24), wood);
    top.position.set(tx, fy + 2.3, tz); scene.add(top);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.07, .12, .72, 12), gold);
    leg.position.set(tx, fy + 1.9, tz); scene.add(leg);
  });
  addPlanter(scene, room.xMin + 1.2, room.zMin + 1.2, fy, gold);
  addPlanter(scene, room.xMax - 1.5, room.zMax - 1.5, fy, gold);
}

function addToiletDecor(scene: THREE.Scene, room: Room, wood: THREE.Material, gold: THREE.Material) {
  const fy = room.floorY;
  // Stall dividers
  [17, 20, 23].forEach(tx => {
    addBox(scene, .12, 2.4, 4.2, tx, fy + 1.2 + 1.5, 8.8, wood);
    addBox(scene, 2.6, 2.4, .12, tx + 1.3, fy + 1.2 + 1.5, 10.85, wood);
  });
  addBox(scene, 7.2, .22, .6, 19.5, fy + 2.45, 3.5, gold);
  addPlanter(scene, 15.5, 4.2, fy, gold);
}

function addBench(scene: THREE.Scene, x: number, z: number, floorY: number, ry: number, material: THREE.Material) {
  const g = new THREE.Group();
  g.position.set(x, floorY, z);
  g.rotation.y = ry;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(3.0, .2, .8), material);
  seat.position.y = .58; g.add(seat);
  [-1.2, 1.2].forEach(px => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(.12, .58, .6), material);
    leg.position.set(px, .29, 0); g.add(leg);
  });
  scene.add(g);
}

function addPedestal(scene: THREE.Scene, x: number, z: number, floorY: number, material: THREE.Material) {
  addBox(scene, .8, .9, .8, x, floorY + .45, z, material);
  const bust = new THREE.Mesh(new THREE.SphereGeometry(.22, 16, 12), material);
  bust.position.set(x, floorY + 1.08, z); bust.castShadow = true; scene.add(bust);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.13, .2, .28, 12), material);
  neck.position.set(x, floorY + .82, z); scene.add(neck);
}

function addPlanter(scene: THREE.Scene, x: number, z: number, floorY: number, trim: THREE.Material) {
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(.28, .38, .6, 16), new THREE.MeshStandardMaterial({ color: 0x1a1714, roughness: .65 }));
  pot.position.set(x, floorY + .3, z); scene.add(pot);
  const leaves = new THREE.MeshStandardMaterial({ color: 0x234525, roughness: .85 });
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(.15, .9 + (i%3)*.12, 8), leaves);
    leaf.position.set(x + Math.sin(i*2.1)*.17, floorY + 1.0, z + Math.cos(i*2.1)*.17);
    leaf.rotation.z = Math.sin(i) * .3; scene.add(leaf);
  }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.29, .04, 8, 20), trim);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(x, floorY + .6, z); scene.add(rim);
}

// ─── Gallery helpers ──────────────────────────────────────────────────────────

/**
 * addSideGallery – places paintings on 3 walls of a side room.
 * "left" rooms (x < 0) have the door on the east wall  (x=xMax).
 * "right" rooms (x > 0) have the door on the west wall (x=xMin).
 * Paintings are correctly offset from their wall surface (±0.12 units).
 */
function addSideGallery(
  scene: THREE.Scene, loader: THREE.TextureLoader, images: string[],
  room: Room, doorSide: "left"|"right", gold: THREE.Material
) {
  const WO = 1.05;  // Inner wall surface is at 1.0 (0.5 shift + 0.5 half-thickness). 0.05 extra to prevent z-fighting.
  const fy  = room.floorY;
  const cy  = fy + 2.8;
  const rW  = room.xMax - room.xMin;  // 22 units
  const rD  = room.zMax - room.zMin;  // 10 units

  const spots: [number, number, number, number][] = []; // [x, z, ry, width]

  if (doorSide === "left") {
    // WEST (outer) wall — 2 paintings
    const wx = room.xMin + WO;
    [rD*0.33, rD*0.67].forEach(offset =>
      spots.push([wx, room.zMin + offset, Math.PI / 2, 2.2])
    );
    // NORTH (far) wall — 4 paintings
    const nz = room.zMin + WO;
    [rW*0.2, rW*0.4, rW*0.6, rW*0.8].forEach(offset =>
      spots.push([room.xMin + offset, nz, 0, 2.2])
    );
    // SOUTH (near) wall — 4 paintings
    const sz = room.zMax - WO;
    [rW*0.2, rW*0.4, rW*0.6, rW*0.8].forEach(offset =>
      spots.push([room.xMin + offset, sz, Math.PI, 2.2])
    );
  } else {
    // EAST (outer) wall — 2 paintings
    const ex = room.xMax - WO;
    [rD*0.33, rD*0.67].forEach(offset =>
      spots.push([ex, room.zMin + offset, -Math.PI / 2, 2.2])
    );
    // NORTH (far) wall — 4 paintings
    const nz = room.zMin + WO;
    [rW*0.2, rW*0.4, rW*0.6, rW*0.8].forEach(offset =>
      spots.push([room.xMin + offset, nz, 0, 2.2])
    );
    // SOUTH (near) wall — 4 paintings
    const sz = room.zMax - WO;
    [rW*0.2, rW*0.4, rW*0.6, rW*0.8].forEach(offset =>
      spots.push([room.xMin + offset, sz, Math.PI, 2.2])
    );
  }

  images.slice(0, spots.length).forEach((src, i) => {
    const [px, pz, pry, pw] = spots[i];
    addArtwork(scene, loader, src, px, pz, pry, pw, cy, fy, true, false);
  });
}

function addTunnelGallery(scene: THREE.Scene, loader: THREE.TextureLoader, images: string[], room: Room, gold: THREE.Material) {
  const WO     = 1.05; // 1.0 inner surface + 0.05 offset
  const cy     = room.floorY + 2.8;
  const leftX  = room.xMin + WO;
  const rightX = room.xMax - WO;
  
  // Safe Zs: spread evenly in the longer tunnel
  const safeZs = [-24, -34, -44, -54, -64];

  images.forEach((src, i) => {
    const isLeft = i % 2 === 0;
    const pair   = Math.floor(i / 2);
    if (pair >= safeZs.length) return;
    
    const pz     = safeZs[pair];
    const px     = isLeft ? leftX : rightX;
    const pry    = isLeft ? Math.PI / 2 : -Math.PI / 2;
    addArtwork(scene, loader, src, px, pz, pry, 2.2, cy, room.floorY, false, false);
  });
}

// ─── Artwork ──────────────────────────────────────────────────────────────────
function addArtwork(
  scene: THREE.Scene, loader: THREE.TextureLoader, src: string,
  x: number, z: number, ry: number,
  width: number, centerY: number, floorY: number,
  barrier: boolean, finalPiece: boolean
) {
  const group = new THREE.Group();
  group.position.set(x, centerY, z);
  group.rotation.y = ry;

  // Dark wooden frame backing (loaded size, placeholder until texture loads)
  const frameMat = new THREE.MeshStandardMaterial({ color: finalPiece ? 0xd4a02a : 0x2c1c0e, roughness: .2, metalness: .7 });
  const backing  = new THREE.Mesh(new THREE.BoxGeometry(width + .24, width / 1.3 + .24, .14), frameMat);
  backing.castShadow = true;
  group.add(backing);

  // Placeholder canvas (dark)
  // Image plane — lives further forward than backing to avoid z-fighting
  const imgMat = new THREE.MeshBasicMaterial({ color: 0x1a1714 });
  const image  = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 1.3), imgMat);
  image.position.z = .12;   // well clear of backing at z=0
  group.add(image);

  loader.load(src, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    const aspect = (texture.image as HTMLImageElement).width / (texture.image as HTMLImageElement).height;
    const maxH   = finalPiece ? 13.0 : 3.2;
    const fw     = Math.min(width, maxH * aspect);
    const fh     = fw / aspect;

    image.geometry.dispose();
    backing.geometry.dispose();
    image.geometry   = new THREE.PlaneGeometry(fw, fh);
    backing.geometry = new THREE.BoxGeometry(fw + .32, fh + .32, .18);

    // Four gold frame strips – EMISSIVE so they glow in the dark
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4a02a, roughness: .12, metalness: .95,
      emissive: 0xc88a18, emissiveIntensity: finalPiece ? 1.8 : 0.9,
    });
    [
      [fw + .32, .16, 0,          fh/2 + .24,  0],
      [fw + .32, .16, 0,         -fh/2 - .24,  0],
      [.16, fh + .32, -fw/2 - .24, 0,          0],
      [.16, fh + .32,  fw/2 + .24, 0,          0],
    ].forEach(([bw, bh, bx, by]) => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(bw as number, bh as number, .1), goldMat);
      s.position.set(bx as number, by as number, .09);  // z=.09, between backing(0) and image(.12)
      group.add(s);
    });

    imgMat.map = texture;
    (imgMat as THREE.MeshBasicMaterial).color.set(0xffffff);
    imgMat.needsUpdate = true;

    // Picture lamp above frame
    const lampW   = Math.min(fw * .6, finalPiece ? 4.0 : 1.5);
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xc8962c, emissive: 0xffd090, emissiveIntensity: 2.2, metalness: .85, roughness: .15 });
    const lamp    = new THREE.Mesh(new THREE.BoxGeometry(lampW, .09, .14), lampMat);
    lamp.position.set(0, fh / 2 + .38, .2);
    group.add(lamp);
  });


  scene.add(group);

  // Rope barrier in front of the painting
  if (barrier) {
    const bw = Math.min(width * .75, 3.5);
    addRope(scene, x + Math.sin(ry) * 1.1, z + Math.cos(ry) * 1.1, bw, ry, floorY);
  }

  // Extra spotlights for the final masterpiece
  if (finalPiece) {
    [[-5, 0], [0, 0], [5, 0]].forEach(([ox]) => {
      const spot = new THREE.SpotLight(0xfff8e8, 180, 28, Math.PI / 6, .55, 1.5);
      spot.position.set(x + ox, floorY + 6.0, z + 10);
      spot.target.position.set(x, centerY, z);
      scene.add(spot, spot.target);
    });
  }
}

function addRope(scene: THREE.Scene, x: number, z: number, width: number, ry: number, floorY = 0) {
  const g     = new THREE.Group();
  g.position.set(x, floorY, z);
  g.rotation.y = ry;
  const metal = new THREE.MeshStandardMaterial({ color: 0xb7b3aa, metalness: .9, roughness: .18 });
  const red   = new THREE.MeshStandardMaterial({ color: 0xa40813, roughness: .4 });
  [-width/2, width/2].forEach(px => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.033, .042, .85, 10), metal);
    post.position.set(px, .42, 0); g.add(post);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.14, .17, .05, 16), metal);
    base.position.set(px, .025, 0); g.add(base);
  });
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(.033, .033, width, 10), red);
  rope.rotation.z = Math.PI / 2;
  rope.position.y = .78;
  g.add(rope);
  scene.add(g);
}

// ─── Label (3D canvas sign) ───────────────────────────────────────────────────
function addLabel(scene: THREE.Scene, text: string, x: number, y: number, z: number, ry: number, width: number, goldStyle = false) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 220;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  if (goldStyle) {
    // Transparent background, large gold text with glow
    ctx.clearRect(0, 0, 1024, 220);
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 28;
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 68px Georgia, serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, 512, 112);
    // Second pass for stronger glow
    ctx.shadowBlur = 14;
    ctx.fillText(text, 512, 112);
  } else {
    ctx.fillStyle = "rgba(20,16,12,.93)";
    ctx.fillRect(0, 0, 1024, 220);
    ctx.strokeStyle = "#c99c53"; ctx.lineWidth = 9;
    ctx.strokeRect(7, 7, 1010, 206);
    ctx.fillStyle = "#f4e6c5";
    ctx.font = "bold 52px Georgia, serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, 512, 112);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(width, width / 4.65),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true })
  );
  sign.position.set(x, y, z);
  sign.rotation.y = ry;
  scene.add(sign);
}

// ─── Marble texture (procedural) ─────────────────────────────────────────────
function makeMarbleTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const pixels = ctx.createImageData(512, 512);
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
      const warp = Math.sin(x * .017 + y * .008) * 30 + Math.sin(y * .041) * 9;
      const wave = Math.sin((x + y * .68 + warp) * .031);
      const fine = Math.sin((x * .8 - y + warp) * .085);
      const vein = Math.pow(Math.abs(wave), 24) * 18 + Math.pow(Math.abs(fine), 34) * 7;
      const cloud = Math.sin(x * .013) * Math.sin(y * .011) * 6;
      const k = (y * 512 + x) * 4;
      pixels.data[k]   = 228 - vein + cloud;
      pixels.data[k+1] = 220 - vein + cloud;
      pixels.data[k+2] = 206 - vein + cloud;
      pixels.data[k+3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
