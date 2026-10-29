import { CSSProperties, useEffect, useState } from 'react';

const LINES = [
  'PORT SYSTEM BIOS  V1.00',
  'CPU ........... OK',
  'MEMORY ........ 2048K OK',
  'GPU ........... 3D READY',
  'LOADING PORTFOLIO.EXE',
];
const TOTAL_MS = 3700; // matches the CSS delays: lines, then the progress bar

/** PS1-style start-up screen. Click or press any key to skip. */
export default function Boot({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    let left = false;
    let doneTimer = 0;

    const leave = (fast: boolean) => {
      if (left) return;
      left = true;
      setLeaving(true);
      doneTimer = window.setTimeout(onDone, fast || reduced ? 150 : 450);
    };
    const leaveTimer = window.setTimeout(
      () => leave(false),
      reduced ? 600 : TOTAL_MS,
    );
    const skip = () => leave(true);

    window.addEventListener('pointerdown', skip);
    window.addEventListener('keydown', skip);
    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(doneTimer);
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('keydown', skip);
    };
  }, [onDone]);

  return (
    <div
      className={`boot${leaving ? ' leaving' : ''}`}
      role="status"
      aria-label="Loading"
    >
      <div className="boot-logo">
        PORT<span>_</span>
      </div>
      <p className="boot-sub">ENTERTAINMENT SYSTEM</p>
      <ul className="boot-lines">
        {LINES.map((line, i) => (
          <li key={line} style={{ '--i': i } as CSSProperties}>
            {line}
          </li>
        ))}
      </ul>
      <div className="boot-bar">
        <i />
      </div>
      <p className="boot-skip">CLICK TO SKIP</p>
    </div>
  );
}
