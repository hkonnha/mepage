import { useEffect, useState } from 'react';

export function scrollToSection(id: string) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Tracks which section is in view and keeps the URL hash in sync. */
export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);

  useEffect(() => {
    const initial = window.location.hash.slice(1);
    if (initial && ids.includes(initial)) {
      requestAnimationFrame(() =>
        document.getElementById(initial)?.scrollIntoView(),
      );
    }

    const onScroll = () => {
      const line = window.innerHeight * 0.12;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
      const hash = current === ids[0] ? '' : `#${current}`;
      if (window.location.hash !== hash) {
        window.history.replaceState(
          null,
          '',
          window.location.pathname + window.location.search + hash,
        );
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return active;
}
