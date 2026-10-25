import { carreras, universidades } from '../../data/content';
import { useDocumentTitle } from '../../ui/hooks';
import { useProfile } from '../../ui/use-profile';
import { Icon } from '../../ui/icons';
import { AppLink, PageHeader, SourceNote, TiltCard } from '../../ui/primitives';

export default function CareersPage() {
  useDocumentTitle('Mallas');
  const profile = useProfile();
  return (
    <div>
      <PageHeader
        eyebrow="Mallas curriculares"
        title="Elige una carrera"
        subtitle="Mallas copiadas de las páginas oficiales de cada universidad, con la fecha en que se consultaron. ÁBACO no está afiliado a ninguna de ellas."
        actions={
          <AppLink to="/comparar" className="btn btn-ghost">
            <Icon name="compare" size={18} /> Comparar mallas
          </AppLink>
        }
      />
      <div className="space-y-12">
        {universidades.map((u) => (
          <section key={u.id} aria-labelledby={`u-${u.id}`}>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`u-${u.id}`} className="font-display text-2xl font-semibold">
                {u.nombre}
              </h2>
              <a href={u.url_unidad} target="_blank" rel="noopener noreferrer" className="link-red inline-flex items-center gap-1 text-sm">
                {u.unidad_academica} <Icon name="external" size={15} />
              </a>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {carreras
                .filter((c) => c.universidad === u.id)
                .map((c) => (
                  <li key={c.id}>
                    <AppLink to={`/carrera/${c.id}`} className="block h-full">
                      <TiltCard className="flex h-full flex-col gap-3 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <span className="tile">
                            <Icon name="mallas" />
                          </span>
                          {profile.carrera === c.id ? <span className="chip border-red text-red">Mi carrera</span> : null}
                        </div>
                        <span className="font-display text-xl leading-tight font-semibold">{c.nombre}</span>
                        <span className="text-sm text-muted">{c.titulo_otorgado}</span>
                        <span className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
                          <span className="tnum">{c.num_ciclos} ciclos</span>
                          <span className="tnum">{c.asignaturas_listadas} asignaturas</span>
                          <span>{c.modalidad.join(' · ')}</span>
                        </span>
                      </TiltCard>
                    </AppLink>
                  </li>
                ))}
            </ul>
            <SourceNote fuente={u.fuente} className="mt-3" />
          </section>
        ))}
      </div>
    </div>
  );
}
