import { fuentes, materias } from '../../data/content';
import stats from '../../generated/stats.json';
import { useDocumentTitle } from '../../ui/hooks';
import { Icon } from '../../ui/icons';
import { AppLink, Notice, PageHeader } from '../../ui/primitives';
import { formatDate } from '../../ui/utils';
import { LEGAL_DOCS } from '../legal/documents';

const TIPO: Record<string, string> = {
  norma: 'Norma',
  ley: 'Ley',
  libro: 'Libro',
  articulo: 'Artículo',
  pagina_oficial: 'Página oficial',
  documentacion: 'Documentación',
};

const porMateria = stats.porMateria as Record<string, { temas: number; subtemas: number }>;

export default function AboutPage() {
  useDocumentTitle('Fuentes y transparencia');

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <PageHeader
        eyebrow="Acerca de ÁBACO"
        title="Contenido verificado, a la vista"
        subtitle="Qué hay, de dónde sale cada dato y qué reglas sigue la app. Las cifras de esta página se calculan del contenido publicado."
      />

      <Notice icon="info">
        <strong>ÁBACO no está afiliado a ninguna universidad</strong> y no reproduce planes de estudio. Las materias se
        eligieron por lo frecuentes que son en las carreras económicas y administrativas; los temas, subtemas, fórmulas y
        ejercicios son redacción propia y cada uno cita su fuente.
      </Notice>

      <section aria-labelledby="panel">
        <h2 id="panel" className="mb-4 font-display text-2xl font-semibold">
          Panel de contenido
        </h2>
        <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Materias', stats.materias],
            ['Temas', stats.temas],
            ['Subtemas', stats.subtemas],
            ['Fórmulas verificadas', stats.formulas],
            ['Ejercicios', stats.ejercicios],
            ['Términos del glosario', stats.terminos],
            ['Herramientas', stats.herramientas],
            ['Fuentes citadas', stats.fuentes],
          ].map(([label, value]) => (
            <div key={label} className="card p-4">
              <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</dt>
              <dd className="tnum mt-1 font-display text-3xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="card overflow-x-auto" tabIndex={0} role="region" aria-label="Temas y subtemas por materia">
          <table className="tnum w-full text-left text-sm">
            <caption className="sr-only">Temas y subtemas por materia</caption>
            <thead className="border-b border-line bg-surface-2 text-xs text-muted uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">Materia</th>
                <th scope="col" className="px-4 py-3">Temas</th>
                <th scope="col" className="px-4 py-3">Subtemas</th>
              </tr>
            </thead>
            <tbody>
              {materias.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5">
                    <AppLink to={`/materia/${m.id}`} className="font-semibold hover:text-red">
                      {m.nombre}
                    </AppLink>
                  </td>
                  <td className="px-4 py-2.5">{porMateria[m.id]?.temas ?? 0}</td>
                  <td className="px-4 py-2.5">{porMateria[m.id]?.subtemas ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted">
          Antes de publicar, un script descarga el texto de cada sección citada y comprueba que contiene el concepto que
          explica el subtema. Cada ejemplo numérico se recalcula de forma independiente.
        </p>
      </section>

      <section aria-labelledby="legal" className="card space-y-3 p-6">
        <h2 id="legal" className="flex items-center gap-2 font-display text-2xl font-semibold">
          <Icon name="shield" className="text-red" /> Privacidad y condiciones
        </h2>
        <ul className="list-disc space-y-1.5 pl-5 text-ink-2">
          <li>Sin cuentas, sin registro, sin analítica, sin publicidad y sin cookies.</li>
          <li>Tus apuntes, colecciones, hojas, documentos y tarjetas se guardan solo en este navegador.</li>
          <li>Lo único que sale a internet son las consultas que haces en el buscador académico y en las herramientas de datos, hacia los servicios públicos indicados.</li>
          <li>Es gratis: no hay pagos, suscripciones ni cobros ocultos.</li>
        </ul>
        <ul className="grid gap-2 pt-2 sm:grid-cols-2">
          {LEGAL_DOCS.map((d) => (
            <li key={d.id}>
              <AppLink to={`/legal/${d.id}`} className="link-red text-sm">
                {d.titulo} →
              </AppLink>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="fuentes">
        <h2 id="fuentes" className="mb-4 font-display text-2xl font-semibold">
          Fuentes citadas
        </h2>
        <ul className="space-y-2">
          {fuentes.map((f) => (
            <li key={f.id} className="card p-4 text-sm">
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-red">
                {f.titulo}
              </a>
              <p className="text-muted">
                {TIPO[f.tipo]} · {f.autor_editor} · consultado el {formatDate(f.fecha_consulta)} · {f.licencia}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
