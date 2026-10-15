import { useEffect, useRef, useState } from 'react';

let katexPromise: Promise<typeof import('katex')> | null = null;
function loadKatex() {
  katexPromise ??= Promise.all([import('katex'), import('katex/dist/katex.min.css')]).then(([k]) => k);
  return katexPromise;
}

/** Typesets LaTeX with KaTeX (loaded on demand). The raw expression is the accessible fallback. */
export function MathFormula({ latex, display = true, label }: { latex: string; display?: boolean; label?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    void loadKatex().then((katex) => {
      if (!alive || !ref.current) return;
      katex.default.render(latex, ref.current, { displayMode: display, throwOnError: false, output: 'htmlAndMathml', strict: 'ignore', trust: false });
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [latex, display]);
  return (
    <span className={display ? 'block text-center text-ink' : 'text-ink'} {...(label ? { role: 'math', 'aria-label': label } : {})}>
      {/* KaTeX owns this node; React never renders children inside it. */}
      <span ref={ref} />
      {ready ? null : <code className="font-mono text-sm text-muted">{latex}</code>}
    </span>
  );
}
