import { useMemo, useState } from 'react';
import { materias } from '../../data/content';
import { AREAS, type Area, type Materia } from '../../domain/content/schemas';
import { normalizeText } from '../../domain/text/normalize';
import { areaLabel } from '../../ui/areas';
import { useDocumentTitle } from '../../ui/hooks';
import { Icon } from '../../ui/icons';
import { AppLink, AreaTile, EmptyState, PageHeader, TiltCard } from '../../ui/primitives';
import { useProfile } from '../../ui/use-profile';
import { useToast } from '../../ui/use-toast';
import { CareerCycle } from './CareerCycle';
import { toggleMySubject } from './my-subjects';

function matches(m: Materia, query: string): boolean {
  if (!query) return true;
  const haystack = normalizeText([m.nombre, m.descripcion, ...m.sinonimos].join(' '));
  return normalizeText(query)
    .split(' ')
    .every((word) => haystack.includes(word));
}

function SubjectCard({ materia, mine, onToggle }: { materia: Materia; mine: boolean; onToggle: () => void }) {
  return (
    <TiltCard className="flex h-full flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <AreaTile area={materia.areas[0] ?? 'gestion'} />
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={mine}
          className={`chip relative z-10 min-h-9 ${mine ? 'border-red text-red' : ''}`}
        >
          {/* Constant visible label (WCAG 2.5.3); the state is aria-pressed, the icon and the color. */}
          <Icon name={mine ? 'check' : 'plus'} size={15} /> La llevo
          <span className="sr-only">: {materia.nombre}</span>
        </button>
      </div>
      <AppLink
        to={`/materia/${materia.id}`}
        className="group flex flex-1 flex-col gap-2 after:absolute after:inset-0 after:content-['']"
      >
        <span className="font-display text-xl leading-tight font-semibold group-hover:text-red">
          {materia.nombre}
        </span>
        <span className="text-sm text-muted">{materia.descripcion}</span>
      </AppLink>
    </TiltCard>
  );
}

export default function MateriasPage() {
  useDocumentTitle('Materias');
  const profile = useProfile();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [area, setArea] = useState<Area | 'todas'>('todas');

  const visible = useMemo(
    () => materias.filter((m) => matches(m, query) && (area === 'todas' || m.areas.includes(area))),
    [query, area],
  );
  const mine = materias.filter((m) => profile.materias.includes(m.id));
  const usedAreas = AREAS.filter((a) => materias.some((m) => m.areas[0] === a));

  const toggle = async (m: Materia) => {
    try {
      const added = await toggleMySubject(profile.materias, m.id);
      toast.show(added ? `${m.nombre} está en tus materias` : `${m.nombre} salió de tus materias`);
    } catch (error) {
      toast.error(error);
    }
  };

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Materias"
        title="Todas las materias, tema por tema"
        subtitle={`${materias.length} materias del área económica y administrativa, ordenadas por carrera y ciclo, cada una con temas y subtemas explicados y una fuente citada en cada subtema. Marca las que llevas para tenerlas a mano.`}
      />

      <CareerCycle profile={profile} />

      {mine.length > 0 ? (
        <section aria-labelledby="mis-materias">
          <h2 id="mis-materias" className="mb-4 font-display text-2xl font-semibold">
            Mis materias
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mine.map((m) => (
              <li key={m.id} className="relative">
                <SubjectCard materia={m} mine onToggle={() => void toggle(m)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="catalogo" className="space-y-5">
        <h2 id="catalogo" className="font-display text-2xl font-semibold">
          Todas las materias
        </h2>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Filtrar materias</span>
            <Icon
              name="search"
              size={18}
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted"
            />
            <input
              className="field pl-10"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrar: costos, estadística, marketing…"
              maxLength={80}
            />
          </label>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Área">
            {(['todas', ...usedAreas] as const).map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={area === a}
                onClick={() => setArea(a)}
                className={`chip min-h-10 ${area === a ? 'border-red bg-red-soft text-red' : ''}`}
              >
                {a === 'todas' ? 'Todas' : areaLabel(a)}
              </button>
            ))}
          </div>
        </div>
        {visible.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((m) => (
              <li key={m.id} className="relative">
                <SubjectCard
                  materia={m}
                  mine={profile.materias.includes(m.id)}
                  onToggle={() => void toggle(m)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="search" title="Ninguna materia coincide">
            Prueba con otra palabra o elige «Todas».
          </EmptyState>
        )}
      </section>

      <p className="text-sm text-muted">
        El catálogo agrupa las materias más frecuentes de las carreras económicas y administrativas. ÁBACO no
        reproduce planes de estudio ni está afiliado a ninguna universidad.
      </p>
    </div>
  );
}
