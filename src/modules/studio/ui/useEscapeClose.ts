import { useEffect, useRef } from 'react';

type Surface = { close: () => void; busy: () => boolean };
const stack: Surface[] = [];

export function useEscapeClose(open: boolean, close: () => void, busy: boolean | (() => boolean) = false) {
  const closeRef = useRef(close);
  const busyRef = useRef(busy);
  const previousFocus = useRef<HTMLElement | null>(null);
  closeRef.current = close;
  busyRef.current = busy;
  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement;
    requestAnimationFrame(() => { const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"]'); dialogs[dialogs.length - 1]?.focus(); });
    const surface: Surface = { close: () => closeRef.current(), busy: () => typeof busyRef.current === 'function' ? busyRef.current() : busyRef.current };
    stack.push(surface);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || stack[stack.length - 1] !== surface || surface.busy()) return;
      event.preventDefault();
      surface.close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); const index = stack.indexOf(surface); if (index >= 0) stack.splice(index, 1); previousFocus.current?.focus(); };
  }, [open]);
}
