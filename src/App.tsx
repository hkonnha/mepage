import { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import Boot from './components/Boot';
import ContactTerminal from './components/ContactTerminal';
import CrtToggle from './components/CrtToggle';
import Cursor from './components/Cursor';
import Nav, { NavItem } from './components/Nav';
import Scene from './components/Scene';
import { useActiveSection } from './hooks/useActiveSection';
import { sceneState } from './sceneState';
import './App.css';

const ITEMS: NavItem[] = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'work', label: 'Work' },
  { id: 'skills', label: 'Skills' },
  { id: 'contact', label: 'Contact' },
];

const PROJECTS = [
  { name: 'Project One', tag: 'WebGL / 2026' },
  { name: 'Project Two', tag: 'Design system / 2025' },
  { name: 'Project Three', tag: 'Interactive / 2025' },
  { name: 'Project Four', tag: 'Tooling / 2024' },
];

const SKILLS = [
  'React',
  'TypeScript',
  'Three.js',
  '3D Modeling',
  'Game Development',
  'Node',
];

const SECTION_IDS = ITEMS.map((i) => i.id);

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const stagger = (i: number) => ({ '--i': i }) as CSSProperties;

const HERO_X_START = 0.77;
const HERO_X_END = 0.27;

export default function App() {
  const root = useRef<HTMLDivElement>(null);
  const active = useActiveSection(SECTION_IDS);
  const [booting, setBooting] = useState(true);

  // Lock scrolling during the boot sequence, then start the page animations.
  useEffect(() => {
    document.documentElement.classList.add('booting');
  }, []);
  const finishBoot = useCallback(() => {
    const html = document.documentElement;
    html.classList.remove('booting');
    html.classList.add('booted');
    sceneState.awake = true;
    setBooting(false);
  }, []);

  // Scroll-linked effects: the hero transition, the marquee and the head riding out with the hero.
  useEffect(() => {
    const el = root.current!;
    const home = el.querySelector<HTMLElement>('#home')!;
    const about = el.querySelector<HTMLElement>('#about')!;
    const slide = el.querySelector<HTMLElement>('.hero-slide')!;
    const panel = el.querySelector<HTMLElement>('.hero-panel')!;
    const panelItems = Array.from(
      el.querySelectorAll<HTMLElement>('.panel-text > *'),
    );
    const marquee = el.querySelector<HTMLElement>('.marquee')!;
    const track = el.querySelector<HTMLElement>('.marquee-track')!;

    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;

      // Hero: the slide leaves left, the white panel wipes in from the right
      // and the head crosses to the left. Progress runs while the hero is pinned.
      const h = home.getBoundingClientRect();
      const p = clamp(-h.top / (h.height - vh));
      slide.style.transform = `translateX(${-110 * p}%)`;
      panel.style.transform = `translateX(${100 * (1 - p)}%)`;
      panelItems.forEach((item, i) => {
        const q = clamp((p - 0.55 - i * 0.07) / 0.3);
        item.style.opacity = String(q);
        item.style.transform = `translateX(${80 * (1 - q)}px)`;
      });
      sceneState.x = lerp(HERO_X_START, HERO_X_END, p);
      sceneState.spin = p * Math.PI * 2;
      sceneState.progress = p;

      // Once the hero unpins it scrolls away; the head rides up with it.
      sceneState.lift = clamp((vh - h.bottom) / vh, 0, 2);

      // Marquee slides sideways while it crosses the screen.
      const m = marquee.getBoundingClientRect();
      const r = clamp((vh - m.top) / (vh + m.height));
      track.style.transform = `translateX(${-50 * r}%)`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    // Paging between Home, the finished white panel and About: one wheel
    // gesture glides to the next stop instead of landing in between.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let target: number | null = null;
    let startedAt = 0;
    let lastWheel = 0;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      if (document.documentElement.classList.contains('booting')) {
        e.preventDefault();
        return;
      }
      const now = performance.now();
      const gap = now - lastWheel;
      lastWheel = now;
      const vh = window.innerHeight;
      const y = window.scrollY;

      if (target !== null) {
        const arrived = Math.abs(y - target) < 2 && gap > 120;
        if (!arrived && now - startedAt < 1500) {
          e.preventDefault(); // swallow the rest of the gesture while gliding
          return;
        }
        target = null;
      }

      const heroEnd = home.getBoundingClientRect().top + y + vh * 1.2;
      const aboutTop = about.getBoundingClientRect().top + y;
      const stops = [0, heroEnd, aboutTop];
      const dir = Math.sign(e.deltaY);
      let next: number | undefined;
      if (dir > 0 && y < aboutTop - 1) {
        next = stops.find((stop) => stop > y + 1);
      } else if (dir < 0 && y > 1 && y <= aboutTop + 1) {
        next = [...stops].reverse().find((stop) => stop < y - 1);
      } else if (dir < 0 && y > aboutTop + 1 && y + e.deltaY < aboutTop) {
        next = aboutTop; // don't skip past About's top on the way up
      }
      if (next === undefined) return;

      e.preventDefault();
      target = next;
      startedAt = now;
      window.scrollTo({
        top: next,
        behavior: reduced.matches ? 'auto' : 'smooth',
      });
    };

    update();
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  // Fade-in-on-scroll for anything marked .reveal.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        }),
      { rootMargin: '0px 0px -12% 0px' },
    );
    root
      .current!.querySelectorAll('.reveal')
      .forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={root}>
      {booting && <Boot onDone={finishBoot} />}
      <Scene />
      <CrtToggle />
      <div className="scanlines" aria-hidden />
      <div className="crt-roll" aria-hidden />
      <div className="crt-frame" aria-hidden />
      <Cursor />
      <Nav items={ITEMS} active={active} />

      <main>
        <section id="home" className="hero">
          <div className="hero-sticky">
            <div className="hero-slide">
              <p className="eyebrow">&gt; portfolio.exe</p>
              <h1 className="hero-title">
                <span className="hero-line" style={stagger(0)}>
                  <span>Lorem</span>
                </span>
                <span className="hero-line" style={stagger(1)}>
                  <span>Ipsum</span>
                </span>
                <span className="hero-line outline" style={stagger(2)}>
                  <span>Dolor.</span>
                </span>
              </h1>
              <p className="scroll-hint">SCROLL ▼</p>
            </div>
            <div className="hero-panel">
              <div className="panel-text">
                <p className="eyebrow">&gt; 01 / intro</p>
                <h2>
                  Lorem
                  <br />
                  ipsum
                  <br />
                  dolor.
                </h2>
                <p className="big">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit!
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="marquee" aria-hidden>
          <div className="marquee-track">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i}>LOREM IPSUM ✶ DOLOR SIT ✶ </span>
            ))}
          </div>
        </div>

        <section id="about" className="section">
          <h2 className="reveal">About</h2>
          <p className="big reveal">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore.
          </p>
        </section>

        <section id="work" className="section">
          <h2 className="reveal">Work</h2>
          <ul className="projects">
            {PROJECTS.map((p, i) => (
              <li
                key={p.name}
                className="project reveal reveal-left"
                style={stagger(i)}
                data-hover
              >
                <span className="num">0{i + 1}</span>
                <span className="name">{p.name}</span>
                <span className="tag">{p.tag}</span>
              </li>
            ))}
          </ul>
        </section>

        <section id="skills" className="section">
          <h2 className="reveal">Skills</h2>
          <div className="skills">
            {SKILLS.map((s, i) => (
              <span
                key={s}
                className="skill reveal reveal-pop"
                style={stagger(i)}
                data-hover
              >
                {s}
              </span>
            ))}
          </div>
        </section>

        <section id="contact" className="section">
          <h2 className="reveal">Contact</h2>
          <div className="reveal">
            <ContactTerminal />
          </div>
          <a className="mail-link" href="mailto:you@example.com">
            or just email you@example.com →
          </a>
        </section>
      </main>
    </div>
  );
}
