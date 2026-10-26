import { useParams } from 'react-router';
import { SITE } from '../../config/site';
import { NotFoundPage } from '../../app/Fallbacks';
import { useDocumentTitle } from '../../ui/hooks';
import { AppLink, PageHeader } from '../../ui/primitives';
import { formatDate } from '../../ui/utils';
import { getLegalDoc, LEGAL_DOCS, SERVICIOS_EXTERNOS } from './documents';
import { Icon } from '../../ui/icons';

/** Turns bare https URLs inside a legal paragraph into links (the texts are our own, not user input). */
function Linked({ text }: { text: string }) {
  const parts = text.split(/(https:\/\/[^\s),]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('https://') ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="link-red break-all">
            {part.replace(/^https:\/\//, '')}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export default function LegalPage() {
  const { docId = '' } = useParams();
  const doc = getLegalDoc(docId);
  useDocumentTitle(doc?.titulo ?? 'Legal');
  if (!doc) return <NotFoundPage />;

  return (
    <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_16rem]">
      <article className="min-w-0 space-y-8">
        <PageHeader
          eyebrow="Legal"
          title={doc.titulo}
          subtitle={`${doc.resumen} Vigente desde el ${formatDate(SITE.vigencia)}.`}
        />
        {doc.secciones.map((s) => (
          <section key={s.titulo} className="space-y-3">
            <h2 className="font-display text-xl font-semibold">{s.titulo}</h2>
            {s.parrafos?.map((p) => (
              <p key={p} className="leading-relaxed text-ink-2">
                <Linked text={p} />
              </p>
            ))}
            {s.lista ? (
              <ul className="list-disc space-y-1.5 pl-5 leading-relaxed text-ink-2">
                {s.lista.map((item) => (
                  <li key={item}>
                    <Linked text={item} />
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
        {doc.id === 'privacidad' ? (
          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold">
              Servicios con los que se conecta tu navegador
            </h2>
            <div className="card overflow-x-auto" tabIndex={0} role="region" aria-label="Servicios externos">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Servicios externos y para qué se usan</caption>
                <thead className="border-b border-line bg-surface-2 text-xs text-muted uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Servicio
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Cuándo y qué recibe
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SERVICIOS_EXTERNOS.map((s) => (
                    <tr key={s.nombre} className="border-b border-line align-top last:border-0">
                      <td className="px-4 py-2.5">
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold hover:text-red"
                        >
                          {s.nombre}
                        </a>
                      </td>
                      <td className="px-4 py-2.5 text-ink-2">{s.uso}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
        {doc.id === 'licencias' ? (
          <a href={`${import.meta.env.BASE_URL}licencias-terceros.txt`} className="btn btn-ghost" download>
            <Icon name="download" size={18} /> Avisos de licencias de terceros (.txt)
          </a>
        ) : null}
      </article>
      <nav aria-label="Documentos legales" className="lg:sticky lg:top-24 lg:self-start">
        <h2 className="eyebrow mb-3">Documentos</h2>
        <ul className="space-y-1">
          {LEGAL_DOCS.map((d) => (
            <li key={d.id}>
              <AppLink
                to={`/legal/${d.id}`}
                aria-current={d.id === doc.id ? 'page' : undefined}
                className={`block rounded-xl px-3 py-2 text-sm ${d.id === doc.id ? 'bg-red-soft font-semibold text-red' : 'text-ink-2 hover:text-ink'}`}
              >
                {d.titulo}
              </AppLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
