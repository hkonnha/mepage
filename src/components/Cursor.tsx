import { useEffect, useRef } from 'react';

const GRID = 4;

// Pixel sprites: X = outline, W = fill.
const ARROW = [
  'X...........',
  'XX..........',
  'XWX.........',
  'XWWX........',
  'XWWWX.......',
  'XWWWWX......',
  'XWWWWWX.....',
  'XWWWWWWX....',
  'XWWWWWWWX...',
  'XWWWWWWWWX..',
  'XWWWWWXXXXX.',
  'XWWXWWX.....',
  'XWX.XWWX....',
  'XX..XWWX....',
  'X....XWWX...',
  '.....XWWX...',
  '......XWWX..',
  '......XWWX..',
  '.......XX...',
];
const HAND_OPEN = [
  '................',
  '......XX........',
  '.....XWWX.XX....',
  '.....XWWXXWWX...',
  '.....XWWXWWWXXX.',
  '.....XWWXWWWXWWX',
  '.XX..XWWXWWWXWWX',
  'XWWX.XWWWWWWWWWX',
  'XWWWXXWWWWWWWWWX',
  '.XWWWWWWWWWWWWWX',
  '..XWWWWWWWWWWWX.',
  '..XWWWWWWWWWWWX.',
  '...XWWWWWWWWWX..',
  '...XWWWWWWWWWX..',
  '....XWWWWWWWX...',
  '....XXXXXXXXX...',
];
const HAND_CLOSED = [
  '................',
  '................',
  '................',
  '.....XX.XX.XX...',
  '....XWWXWWXWWX..',
  '....XWWWWWWWWWXX',
  '...XXWWWWWWWWWWX',
  '..XWWXWWWWWWWWWX',
  '..XWWWWWWWWWWWWX',
  '..XWWWWWWWWWWWX.',
  '...XWWWWWWWWWWX.',
  '...XWWWWWWWWWX..',
  '....XWWWWWWWWX..',
  '....XWWWWWWWX...',
  '....XXXXXXXXX...',
  '................',
];

/** Turns ASCII art into one SVG path per colour (one 1x1 square per pixel). */
const toPaths = (art: string[]) => {
  const pixels = (ch: string) =>
    art
      .flatMap((row, y) =>
        row
          .split('')
          .flatMap((c, x) => (c === ch ? [`M${x} ${y}h1v1h-1z`] : [])),
      )
      .join('');
  return { outline: pixels('X'), fill: pixels('W') };
};

function Sprite({
  art,
  className,
  size,
}: {
  art: string[];
  className: string;
  size: [number, number];
}) {
  const { outline, fill } = toPaths(art);
  return (
    <svg
      className={className}
      width={size[0] * 2}
      height={size[1] * 2}
      viewBox={`0 0 ${size[0]} ${size[1]}`}
      shapeRendering="crispEdges"
    >
      <path fill="#0a0a0a" d={outline} />
      <path className="cursor-fill" d={fill} />
    </svg>
  );
}

export default function Cursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const el = ref.current!;
    document.documentElement.classList.add('has-cursor');

    const move = (e: MouseEvent) => {
      const x = Math.round(e.clientX / GRID) * GRID;
      const y = Math.round(e.clientY / GRID) * GRID;
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.style.opacity = '1';
      const interactive = (e.target as HTMLElement).closest(
        'a, button, [data-hover]',
      );
      el.classList.toggle('is-hover', !!interactive);
    };
    const leave = () => (el.style.opacity = '0');
    const down = () => el.classList.add('is-down');
    const up = () => el.classList.remove('is-down');

    window.addEventListener('mousemove', move);
    document.addEventListener('mouseleave', leave);
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      document.documentElement.classList.remove('has-cursor');
      window.removeEventListener('mousemove', move);
      document.removeEventListener('mouseleave', leave);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, []);

  return (
    <div ref={ref} className="cursor" aria-hidden>
      <Sprite art={ARROW} className="arrow" size={[12, 19]} />
      <Sprite art={HAND_OPEN} className="hand hand-open" size={[16, 16]} />
      <Sprite art={HAND_CLOSED} className="hand hand-closed" size={[16, 16]} />
    </div>
  );
}
