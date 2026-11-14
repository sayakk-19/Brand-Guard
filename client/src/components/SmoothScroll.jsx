import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

// Own one animation loop and release it on unmount (including StrictMode remounts).
export default function SmoothScroll() {
  const { pathname } = useLocation();
  const instance = useRef(null);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const configure = () => {
      instance.current?.destroy();
      instance.current = motion.matches ? null : new Lenis({
        autoRaf: true,
        autoToggle: true,
        lerp: 0.12,
        smoothWheel: true,
        syncTouch: false,
        anchors: true,
        prevent: (node) => node.matches?.('textarea, select, .modal-card, .sidebar, .table-wrap, .filter-tabs')
      });
    };
    configure();
    motion.addEventListener('change', configure);
    return () => {
      motion.removeEventListener('change', configure);
      instance.current?.destroy();
      instance.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    // Search/filter changes keep the reader's place; a new page starts at the top.
    if (instance.current) instance.current.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
