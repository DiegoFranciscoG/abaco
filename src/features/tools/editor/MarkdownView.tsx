import 'katex/dist/katex.min.css';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Block, Inline } from '../../../domain/tools/markdown';

type Katex = typeof import('katex').default;

/** KaTeX is loaded only when a document has math. trust: false blocks \href, \url and friends. */
function useKatex(needed: boolean): Katex | null {
  const [katex, setKatex] = useState<Katex | null>(null);
  useEffect(() => {
    if (!needed || katex) return;
    let alive = true;
    void import('katex').then((m) => {
      if (alive) setKatex(() => m.default);
    });
    return () => {
      alive = false;
    };
  }, [needed, katex]);
  return katex;
}

function Math({ tex, display, katex }: { tex: string; display: boolean; katex: Katex | null }) {
  const html = useMemo(() => {
    if (!katex) return null;
    return katex.renderToString(tex.slice(0, 2000), {
      displayMode: display,
      throwOnError: false,
      trust: false,
      strict: 'ignore',
      maxSize: 20,
      maxExpand: 200,
      output: 'htmlAndMathml',
    });
  }, [katex, tex, display]);
  if (html === null) return <code className="font-mono text-sm text-muted">{tex}</code>;
  // KaTeX output from KaTeX itself (escaped input, trust disabled): never raw user HTML.
  return display ? (
    <div className="my-3 overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span dangerouslySetInnerHTML={{ __html: html }} />
  );
}

function hasMath(blocks: Block[]): boolean {
  const inline = (nodes: Inline[]): boolean =>
    nodes.some(
      (n) =>
        n.type === 'math' ||
        ((n.type === 'strong' || n.type === 'em' || n.type === 'link') && inline(n.children)),
    );
  return blocks.some((b) => {
    if (b.type === 'math') return true;
    if (b.type === 'paragraph' || b.type === 'heading' || b.type === 'quote') return inline(b.children);
    if (b.type === 'list') return b.items.some(inline);
    if (b.type === 'table') return b.header.some(inline) || b.rows.some((r) => r.some(inline));
    return false;
  });
}

function renderInline(nodes: Inline[], katex: Katex | null): ReactNode[] {
  return nodes.map((n, i) => {
    switch (n.type) {
      case 'text':
        return <span key={i}>{n.text}</span>;
      case 'strong':
        return <strong key={i}>{renderInline(n.children, katex)}</strong>;
      case 'em':
        return <em key={i}>{renderInline(n.children, katex)}</em>;
      case 'code':
        return (
          <code key={i} className="rounded bg-surface-2 px-1 font-mono text-[0.9em]">
            {n.text}
          </code>
        );
      case 'math':
        return <Math key={i} tex={n.tex} display={false} katex={katex} />;
      case 'link':
        return (
          <a key={i} href={n.href} target="_blank" rel="noopener noreferrer nofollow" className="link-red">
            {renderInline(n.children, katex)}
          </a>
        );
      case 'br':
        return <br key={i} />;
      default:
        return null;
    }
  });
}

/** Renders the parsed document with React elements only (text is escaped by React). */
export function MarkdownView({ blocks }: { blocks: Block[] }) {
  const katex = useKatex(hasMath(blocks));
  return (
    <div className="doc-preview space-y-3 leading-relaxed">
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'heading': {
            const cls =
              b.level === 1
                ? 'font-display text-3xl font-semibold'
                : b.level === 2
                  ? 'font-display text-2xl font-semibold mt-6'
                  : 'text-lg font-semibold mt-4';
            const Tag = `h${b.level + 1}` as 'h2' | 'h3' | 'h4';
            return (
              <Tag key={i} className={cls}>
                {renderInline(b.children, katex)}
              </Tag>
            );
          }
          case 'paragraph':
            return <p key={i}>{renderInline(b.children, katex)}</p>;
          case 'list': {
            const items = b.items.map((item, j) => <li key={j}>{renderInline(item, katex)}</li>);
            return b.ordered ? (
              <ol key={i} start={b.start} className="list-decimal space-y-1 pl-6">
                {items}
              </ol>
            ) : (
              <ul key={i} className="list-disc space-y-1 pl-6">
                {items}
              </ul>
            );
          }
          case 'quote':
            return (
              <blockquote key={i} className="border-l-4 border-red/50 pl-4 text-ink-2 italic">
                {renderInline(b.children, katex)}
              </blockquote>
            );
          case 'code':
            return (
              <pre
                key={i}
                className="overflow-x-auto rounded-xl bg-surface-2 p-3 font-mono text-sm"
                tabIndex={0}
              >
                <code>{b.text}</code>
              </pre>
            );
          case 'math':
            return <Math key={i} tex={b.tex} display katex={katex} />;
          case 'hr':
            return <hr key={i} className="border-line" />;
          case 'table':
            return (
              <div
                key={i}
                className="overflow-x-auto"
                tabIndex={0}
                role="region"
                aria-label="Tabla del documento"
              >
                <table className="tnum w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      {b.header.map((h, j) => (
                        <th
                          key={j}
                          scope="col"
                          className="border border-line bg-surface-2 px-3 py-1.5"
                          style={{ textAlign: b.align[j] ?? 'left' }}
                        >
                          {renderInline(h, katex)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, j) => (
                          <td
                            key={j}
                            className="border border-line px-3 py-1.5"
                            style={{ textAlign: b.align[j] ?? 'left' }}
                          >
                            {renderInline(cell, katex)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
