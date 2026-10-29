import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { sceneState } from '../sceneState';

/** Radians of head turn per pixel of mouse movement while grabbed. */
const DRAG_SENSITIVITY = 0.005;
const CAMERA_Z = 8;
const PIXEL = 4; // render resolution divisor: chunky PS1-style pixels
const IDLE_SLEEP_SECONDS = 12;

// PS1 look: vertices snap to a coarse grid (the classic polygon wobble) and
// colours are reduced to a few levels with an ordered dither.
const ps1Uniforms = {
  uSnap: { value: new THREE.Vector2(100, 100) },
  uLevels: { value: 14 },
};

function ps1ify(mat: THREE.Material) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSnap = ps1Uniforms.uSnap;
    shader.uniforms.uLevels = ps1Uniforms.uLevels;
    shader.vertexShader =
      'uniform vec2 uSnap;\n' +
      shader.vertexShader.replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec3 ps1Ndc = gl_Position.xyz / gl_Position.w;
        ps1Ndc.xy = floor(ps1Ndc.xy * uSnap + 0.5) / uSnap;
        gl_Position.xyz = ps1Ndc * gl_Position.w;`,
      );
    shader.fragmentShader =
      `uniform float uLevels;
      float ps1Bayer2(vec2 p) { p = mod(p, 2.0); return mod(p.x * 2.0 + p.y * 3.0, 4.0); }
      float ps1Bayer4(vec2 p) { return (ps1Bayer2(p) * 4.0 + ps1Bayer2(floor(p / 2.0))) / 16.0; }
      ` +
      shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        gl_FragColor.rgb = min(floor(gl_FragColor.rgb * uLevels + ps1Bayer4(gl_FragCoord.xy)) / uLevels, 1.0);`,
      );
  };
  mat.customProgramCacheKey = () => 'ps1';
}

type Face = {
  /** Grabbed: round mouth, wide eyes, raised brows. */
  surprise: number;
  /** Wide eyes and raised brows without the round mouth (e.g. fast scrolling). */
  wide: number;
  /** 0 open .. 1 closed. */
  blink: number;
  /** Bigger smile. */
  happy: number;
  /** Eyes wobble out of sync. */
  dizzy: number;
  sleepy: number;
  t: number;
};

const COLORS = {
  skin: 0xe2ad7d,
  hair: 0x5b3a2b,
  eye: 0x5f78a6,
  mouth: 0xc9826b,
  shirt: 0xf1ede6,
  inside: 0x5a2d27,
};

/** Builds a clay-style bust from simple primitives. */
function buildHead() {
  const mats = {
    skin: new THREE.MeshLambertMaterial({ color: COLORS.skin }),
    hair: new THREE.MeshLambertMaterial({ color: COLORS.hair }),
    eye: new THREE.MeshLambertMaterial({ color: COLORS.eye }),
    mouth: new THREE.MeshLambertMaterial({ color: COLORS.mouth }),
    shirt: new THREE.MeshLambertMaterial({ color: COLORS.shirt }),
    inside: new THREE.MeshLambertMaterial({ color: COLORS.inside }),
  };
  Object.values(mats).forEach(ps1ify);
  const group = new THREE.Group();
  const add = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    pos: [number, number, number],
    scale: [number, number, number] = [1, 1, 1],
  ) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    m.scale.set(...scale);
    group.add(m);
    return m;
  };

  // Torso: a lathed shoulder dome, flattened front to back.
  const torso = new THREE.LatheGeometry(
    [
      [0, -2.4],
      [1.7, -2.4],
      [1.8, -1.9],
      [1.6, -1.3],
      [1.15, -0.95],
      [0.6, -0.72],
      [0, -0.7],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    20,
  );
  add(torso, mats.shirt, [0, 0, 0], [1.15, 1, 0.7]);

  add(new THREE.CylinderGeometry(0.42, 0.5, 1.2, 14), mats.skin, [0, -0.1, 0]);

  // Head, with ears.
  const sphere = new THREE.SphereGeometry(1, 16, 12);
  add(sphere, mats.skin, [0, 0.9, 0], [1, 1.1, 0.95]);
  add(
    new THREE.SphereGeometry(0.27, 10, 8),
    mats.skin,
    [-1.0, 0.85, 0],
    [0.6, 1, 0.9],
  );
  add(
    new THREE.SphereGeometry(0.27, 10, 8),
    mats.skin,
    [1.0, 0.85, 0],
    [0.6, 1, 0.9],
  );

  // Hair: a dome tilted back so the forehead shows, plus a fringe at the front.
  const dome = add(
    new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
    mats.hair,
    [0, 0.92, 0],
    [1.1, 1.12, 1.08],
  );
  dome.rotation.x = -0.5;
  // Front fringe: a flat swoop lying forward over the forehead, not a bun.
  const fringe = add(sphere, mats.hair, [-0.05, 1.78, 0.38], [0.95, 0.28, 0.7]);
  fringe.rotation.set(0.35, 0, 0.08);

  // Face.
  const eye = new THREE.SphereGeometry(0.1, 10, 8);
  const eyes = [
    add(eye, mats.eye, [-0.38, 0.8, 0.88], [1, 1, 0.6]),
    add(eye, mats.eye, [0.38, 0.8, 0.88], [1, 1, 0.6]),
  ];

  const brow = new THREE.BoxGeometry(0.34, 0.07, 0.08);
  const browL = add(brow, mats.hair, [-0.4, 1.1, 0.83]);
  browL.rotation.set(0, -0.4, 0.1);
  const browR = add(brow, mats.hair, [0.38, 1.17, 0.82]);
  browR.rotation.set(0, 0.4, 0.12);

  const smile = add(
    new THREE.TorusGeometry(0.4, 0.045, 6, 12, Math.PI * 0.4),
    mats.mouth,
    [0.05, 0.9, 0.86],
  );
  smile.rotation.z = -Math.PI * 0.7;

  // Surprised ":O" mouth, shown while the head is grabbed.
  const mouthO = new THREE.Group();
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.11, 12), mats.inside);
  const lips = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.04, 6, 12),
    mats.mouth,
  );
  mouthO.add(hole, lips);
  mouthO.position.set(0.04, 0.5, 0.89);
  mouthO.scale.set(1, 1.25, 1);
  mouthO.visible = false;
  group.add(mouthO);

  const brows = [
    { mesh: browL, y: browL.position.y, z: browL.rotation.z },
    { mesh: browR, y: browR.position.y, z: browR.rotation.z },
  ];
  const setFace = (f: Face) => {
    smile.visible = f.surprise < 0.5;
    mouthO.visible = f.surprise >= 0.5;
    const open = Math.max(f.surprise, f.wide);
    const size = 1 + 0.45 * open;
    eyes.forEach((m, i) => {
      const wobble = 1 + 0.3 * Math.sin(f.t * 9 + i * Math.PI) * f.dizzy;
      m.scale.set(size, size * wobble * (1 - 0.9 * f.blink), 0.6);
    });
    brows.forEach((b) => {
      b.mesh.position.y = b.y + 0.14 * open - 0.05 * f.sleepy;
      b.mesh.rotation.z = b.z * (1 - open);
    });
    const grin = 1 + 0.35 * f.happy;
    smile.scale.set(grin, grin, 1);
  };

  group.rotation.z = 0.06;
  group.position.y = 0.17;

  const dispose = () => {
    group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    Object.values(mats).forEach((m) => m.dispose());
  };
  return { group, dispose, setFace };
}

/** Fixed low-res 3D head whose position follows the hero scroll timeline. */
export default function Scene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current!;
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setPixelRatio(1);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.z = CAMERA_Z;

    scene.add(new THREE.AmbientLight(0xffffff, 1.3));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(3, 4, 5);
    scene.add(light);

    const world = new THREE.Group();
    scene.add(world);
    const head = buildHead();
    const pivot = new THREE.Group();
    pivot.add(head.group);
    world.add(pivot);

    const coarse = window.matchMedia('(pointer: coarse)').matches;
    let sized = { w: 0, h: 0 };
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Mobile URL bars resize the viewport while scrolling; don't rebuild
      // the canvas for that, only for real width or orientation changes.
      const urlBarOnly = w === sized.w && Math.abs(h - sized.h) < 150;
      if (coarse && urlBarOnly) return;
      sized = { w, h };
      const cw = Math.ceil(w / PIXEL);
      const ch = Math.ceil(h / PIXEL);
      renderer.setSize(cw, ch, false);
      ps1Uniforms.uSnap.value.set(cw / 4, ch / 4);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    // Cursor position as a 0..1 fraction of the viewport; starts centred.
    const mouse = { x: 0.5, y: 0.5 };
    // Smoothed look direction, eased toward the cursor each frame.
    const look = { yaw: 0, pitch: 0 };

    // Grabbing: dragging turns the head freely; on release it keeps a little
    // momentum, then eases back to looking at the cursor.
    const raycaster = new THREE.Raycaster();
    const html = document.documentElement;
    const drag = { active: false, yaw: 0, pitch: 0, vel: 0 };
    let grab = 0; // eased 0..1 version of drag.active
    let surprise = 0;

    // Moods: sleepy when idle or before boot, startled on waking, wide-eyed
    // while scrolling fast, dizzy after a lot of spinning, happy on the panel.
    let lastInput = performance.now();
    const poke = () => {
      lastInput = performance.now();
    };
    let sleepy = 1;
    let startle = 0;
    let blinkV = 0;
    let blinkUntil = 0;
    let nextBlink = 2;
    let scrollSpeed = 0;
    let lastScrollY = window.scrollY;
    let dizzyAcc = 0;
    let dizzy = 0;

    const hitsHead = (clientX: number, clientY: number) => {
      if (!world.visible) return false;
      raycaster.setFromCamera(
        new THREE.Vector2(
          (clientX / window.innerWidth) * 2 - 1,
          -(clientY / window.innerHeight) * 2 + 1,
        ),
        camera,
      );
      return raycaster.intersectObject(head.group, true).length > 0;
    };
    const last = { x: 0, y: 0 };
    const onPointerMove = (e: PointerEvent) => {
      poke();
      mouse.x = e.clientX / window.innerWidth;
      mouse.y = e.clientY / window.innerHeight;
      if (drag.active) {
        // movementX/Y keep working while the pointer is locked; touch and
        // unlocked pointers report unreliable movement, so use the delta.
        const locked = !!document.pointerLockElement;
        const dx = locked ? e.movementX : e.clientX - last.x;
        const dy = locked ? e.movementY : e.clientY - last.y;
        last.x = e.clientX;
        last.y = e.clientY;
        drag.yaw += dx * DRAG_SENSITIVITY;
        drag.pitch = THREE.MathUtils.clamp(
          drag.pitch + dy * DRAG_SENSITIVITY,
          -1.2,
          1.2,
        );
        drag.vel = dx * DRAG_SENSITIVITY;
        dizzyAcc += Math.abs(dx) * DRAG_SENSITIVITY;
      } else {
        html.classList.toggle('over-head', hitsHead(e.clientX, e.clientY));
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      poke();
      if (e.button !== 0) return;
      if (html.classList.contains('booting')) return; // boot screen skips instead
      if ((e.target as HTMLElement).closest('a, button, header')) return;
      if (!hitsHead(e.clientX, e.clientY)) return;
      e.preventDefault(); // no text selection while dragging
      drag.active = true;
      drag.vel = 0;
      last.x = e.clientX;
      last.y = e.clientY;
      // Lock the mouse so it can't wander off or jump when released. Touch
      // has no cursor to lock; it is held by touchmove below instead.
      if (e.pointerType !== 'mouse') return;
      try {
        Promise.resolve(html.requestPointerLock()).catch(() => {});
      } catch {
        /* dragging still works without the lock */
      }
    };
    // While the head is held, stop the page scrolling or pull-to-refreshing.
    const onTouchMove = (e: TouchEvent) => {
      if (drag.active && e.cancelable) e.preventDefault();
    };
    const onPointerUp = () => {
      drag.active = false;
      if (document.pointerLockElement) document.exitPointerLock();
    };
    const onLockChange = () => {
      if (!document.pointerLockElement) drag.active = false; // e.g. Esc
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('keydown', poke);
    window.addEventListener('wheel', poke, { passive: true });
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('pointerlockchange', onLockChange);

    const halfHeight = Math.tan(THREE.MathUtils.degToRad(25)) * CAMERA_Z;
    let raf = 0;
    const clock = new THREE.Clock();
    const frame = () => {
      const t = reduced ? 0 : clock.getElapsedTime();
      const narrow = camera.aspect < 0.9;

      const frac = narrow ? 0.5 : sceneState.x;
      world.position.set(
        (frac - 0.5) * 2 * halfHeight * camera.aspect,
        (narrow ? halfHeight * 0.4 : 0) + sceneState.lift * 2 * halfHeight,
        0,
      );
      world.scale.setScalar(narrow ? 0.6 : 1);
      world.visible = sceneState.lift < 1.2;

      // Turn toward the cursor relative to where the head is on screen,
      // with a slow idle wiggle layered on top.
      const clamp = THREE.MathUtils.clamp;
      // Real angle to the cursor, exaggerated, with a slight bias to the left.
      const dxWorld = (mouse.x - frac) * 2 * halfHeight * camera.aspect;
      const targetYaw = clamp(
        Math.atan(dxWorld / CAMERA_Z) * 2 - 0.1,
        -1.5,
        1.5,
      );
      const targetPitch = clamp((mouse.y - 0.5) * 2.2, -0.7, 0.7);
      look.yaw += (targetYaw - look.yaw) * 0.12;
      look.pitch += (targetPitch - look.pitch) * 0.12;

      grab += ((drag.active ? 1 : 0) - grab) * 0.2;
      if (!drag.active) {
        drag.yaw += drag.vel;
        dizzyAcc += Math.abs(drag.vel);
        drag.vel *= 0.93;
        // Unwind whole turns so it eases back the short way round.
        drag.yaw -= Math.round(drag.yaw / (Math.PI * 2)) * Math.PI * 2;
        drag.yaw *= 0.95;
        drag.pitch *= 0.92;
      }
      html.classList.toggle('grabbing', drag.active);

      // Sleep when idle (or before the boot finishes); startle on waking.
      const idleFor = (performance.now() - lastInput) / 1000;
      const wantSleep = !sceneState.awake || idleFor > IDLE_SLEEP_SECONDS;
      if (sleepy > 0.6 && !wantSleep) startle = 1;
      sleepy += ((wantSleep ? 1 : 0) - sleepy) * 0.04;
      startle *= 0.94;

      // Blink every few seconds.
      if (t > nextBlink) {
        blinkUntil = t + 0.14;
        nextBlink = t + 2.5 + Math.random() * 3;
      }
      blinkV += ((t < blinkUntil ? 1 : 0) - blinkV) * 0.5;

      // Fast scrolling (including the page glides) widens his eyes.
      scrollSpeed +=
        (Math.abs(window.scrollY - lastScrollY) - scrollSpeed) * 0.2;
      lastScrollY = window.scrollY;
      const wide = clamp(scrollSpeed / 40, 0, 1) * 0.7;

      // A lot of spinning makes him dizzy for a few seconds.
      dizzyAcc *= 0.995;
      dizzy += (clamp((dizzyAcc - 6) / 6, 0, 1) - dizzy) * 0.1;

      const happy = THREE.MathUtils.smoothstep(sceneState.progress, 0.55, 1);

      const free = (1 - grab) * (1 - 0.8 * sleepy); // idle motion fades out
      pivot.rotation.y =
        free * (Math.sin(t * 0.6) * 0.2 + look.yaw) +
        sceneState.spin +
        drag.yaw;
      pivot.rotation.x = free * look.pitch + drag.pitch + 0.4 * sleepy;
      pivot.rotation.z = Math.sin(t * 5) * 0.12 * dizzy;

      const breath = Math.sin(t * 1.8);
      head.group.scale.set(1 + 0.004 * breath, 1 + 0.01 * breath, 1);

      surprise += ((drag.active ? 1 : 0) - surprise) * 0.3;
      head.setFace({
        surprise,
        wide: Math.max(wide, startle * 0.8),
        blink: Math.max(blinkV, sleepy),
        happy,
        dizzy,
        sleepy,
        t,
      });

      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('keydown', poke);
      window.removeEventListener('wheel', poke);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('pointerlockchange', onLockChange);
      if (document.pointerLockElement) document.exitPointerLock();
      html.classList.remove('over-head', 'grabbing');
      mount.removeChild(renderer.domElement);
      renderer.dispose();
      head.dispose();
    };
  }, []);

  return <div ref={mountRef} className="scene" aria-hidden />;
}
