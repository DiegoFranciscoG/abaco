import 'katex/dist/katex.min.css';

/**
 * Shows a formula already typeset with KaTeX. Before the HTML arrives, the raw LaTeX keeps the space
 * reserved (no layout shift). The main formula carries an accessible name.
 */
export function MathFormula({
  latex,
  html,
  display = true,
  label,
}: {
  latex: string;
  html?: string;
  display?: boolean;
  label?: string;
}) {
  const a11y = label ? { role: 'math' as const, 'aria-label': label } : {};
  const className = display ? 'block min-h-[3.25rem] text-center text-ink' : 'text-ink';
  if (!html) {
    return (
      <span className={className} {...a11y}>
        <code className="font-mono text-sm text-muted">{latex}</code>
      </span>
    );
  }
  return <span className={className} {...a11y} dangerouslySetInnerHTML={{ __html: html }} />;
}
