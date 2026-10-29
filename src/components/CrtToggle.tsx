import { useEffect, useState } from 'react';

const KEY = 'port-crt';

const readSaved = () => {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
};

/** Turns the CRT overlay (scanlines, bezel, fringing) on or off. */
export default function CrtToggle() {
  const [on, setOn] = useState(readSaved);

  useEffect(() => {
    document.documentElement.classList.toggle('crt-off', !on);
    try {
      localStorage.setItem(KEY, on ? 'on' : 'off');
    } catch {
      /* private mode: the choice just won't persist */
    }
  }, [on]);

  return (
    <button
      className="crt-toggle"
      aria-pressed={on}
      onClick={() => setOn((v) => !v)}
    >
      CRT: {on ? 'ON' : 'OFF'}
    </button>
  );
}
