import { carreras, fuentes, getUniversidad, loadEjercicios, loadFormulas, loadGlosario, SUBJECTS_WITH_CONTENT } from '../../data/content';
import { useAsync, useDocumentTitle } from '../../ui/hooks';
import { Icon } from '../../ui/icons';
import { Notice, PageHeader } from '../../ui/primitives';
import { formatDate } from '../../ui/utils';

const TIPO: Record<string, string> = {
  norma: 'Norma',
  ley: 'Ley',
  libro: 'Libro',
  articulo: 'Artículo',
  pagina_oficial: 'Página oficial',
  documentacion: 'Documentación',
};

export default function AboutPage() {
  useDocumentTitle('Fuentes y privacidad');
  const stats = useAsync(async () => {
    const [formulas, ejercicios, glosario] = await Promise.all([loadFormulas(), loadEjercicios(), loadGlosario()]);
    return { formulas: formulas.length, ejercicios: ejercicios.length, glosario: glosario.length };
  }, []);
  const totalSubjects = carreras.reduce((a, c) => a + c.asignaturas_listadas, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <PageHeader eyebrow="Acerca de ÁBACO" title="Contenido verificado, a la vista" subtitle="Lo que hay, lo que falta y de dónde sale cada dato. La honestidad sobre lo que falta vale más que fingir que todo está completo." />

      <Notice icon="info">
        <strong>ÁBACO no está afiliado a ninguna universidad.</strong> Las mallas se reproducen con enlace a su fuente oficial; ningún sílabo ni material de clase se copia. El contenido académico es redacción propia y cada ficha muestra su fuente.
      </Notice>

      <section aria-labelledby="panel">
        <h2 id="panel" className="mb-4 font-display text-2xl font-semibold">
          Panel de contenido
        </h2>
        <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Carreras', carreras.length],
            ['Asignaturas', totalSubjects],
            ['Con temario completo', SUBJECTS_WITH_CONTENT.size],
            ['Fórmulas verificadas', stats.status === 'ready' ? stats.data.formulas : '…'],
            ['Ejercicios', stats.status === 'ready' ? stats.data.ejercicios : '…'],
            ['Términos del glosario', stats.status === 'ready' ? stats.data.glosario : '…'],
            ['Fuentes citadas', fuentes.length],
            ['Cuentas de usuario', 0],
          ].map(([label, value]) => (
            <div key={label} className="card p-4">
              <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</dt>
              <dd className="tnum mt-1 font-display text-3xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="card overflow-x-auto">
          <table className="tnum w-full text-left text-sm">
            <caption className="sr-only">Asignaturas por carrera</caption>
            <thead className="border-b border-line bg-surface-2 text-xs text-muted uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">Carrera</th>
                <th scope="col" className="px-4 py-3">Listadas</th>
                <th scope="col" className="px-4 py-3">Declaradas</th>
                <th scope="col" className="px-4 py-3">Con temario</th>
                <th scope="col" className="px-4 py-3">Consultada</th>
              </tr>
            </thead>
            <tbody>
              {carreras.map((c) => {
                const deep = [...SUBJECTS_WITH_CONTENT].filter((id) => id.startsWith(`${c.id}--`)).length;
                return (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5">
                      <a href={c.url_malla} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-red">
                        {getUniversidad(c.universidad)?.siglas} · {c.nombre}
                      </a>
                    </td>
                    <td className="px-4 py-2.5">{c.asignaturas_listadas}</td>
                    <td className={`px-4 py-2.5 ${c.asignaturas_declaradas && c.asignaturas_declaradas !== c.asignaturas_listadas ? 'font-semibold text-warn' : ''}`}>{c.asignaturas_declaradas ?? '—'}</td>
                    <td className="px-4 py-2.5">{deep > 0 ? deep : '—'}</td>
                    <td className="px-4 py-2.5 text-muted">{formatDate(c.fecha_consulta)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted">El temario profundo empieza por el primer ciclo de Contabilidad y Auditoría (UCuenca) y crece por un canal donde cada ficha nueva exige su fuente y pasa pruebas automáticas.</p>
      </section>

      <section aria-labelledby="privacidad" className="card space-y-3 p-6">
        <h2 id="privacidad" className="flex items-center gap-2 font-display text-2xl font-semibold">
          <Icon name="shield" className="text-red" /> Privacidad
        </h2>
        <ul className="list-disc space-y-1.5 pl-5 text-ink-2">
          <li>Sin cuentas, sin registro, sin analítica ni cookies de seguimiento.</li>
          <li>Apuntes, colecciones, hojas y recordatorios se guardan solo en este navegador (IndexedDB).</li>
          <li>El identificador local se genera en el dispositivo y solo nombra tus respaldos; nunca se envía.</li>
          <li>Lo único que sale a internet es el texto que escribes en el buscador académico, hacia Crossref, OpenAlex, DOAJ y LA Referencia, sin correo ni identificadores.</li>
          <li>Las tipografías están dentro de la app: no se consulta a terceros para mostrarlas.</li>
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

      <section aria-labelledby="licencias" className="card p-6 text-sm text-ink-2">
        <h2 id="licencias" className="mb-2 font-display text-xl font-semibold">
          Licencias
        </h2>
        <p>
          Código bajo licencia MIT. Usa Formula.js (MIT) y SheetJS Community Edition (Apache-2.0) para el laboratorio, Three.js (MIT) para el ábaco 3D, KaTeX (MIT) para las fórmulas y las tipografías Inter, Fraunces y JetBrains Mono (SIL Open Font License). Los libros de OpenStax tienen licencia CC BY-NC-SA 4.0: ÁBACO los cita y enlaza, no los reproduce.
        </p>
      </section>
    </div>
  );
}
