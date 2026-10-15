import { useSearchParams } from 'react-router';
import { loadApps } from '../../data/content';
import type { App } from '../../domain/content/schemas';
import { useAsync, useDocumentTitle } from '../../ui/hooks';
import { Icon } from '../../ui/icons';
import { AreaTile, PageHeader, Skeleton } from '../../ui/primitives';
import { formatDate } from '../../ui/utils';

const COST_LABEL: Record<App['costo'], { label: string; className: string }> = {
  gratis: { label: 'Gratis', className: 'bg-ok-soft text-ok' },
  'gratis-con-cuenta': { label: 'Gratis con cuenta', className: 'bg-ok-soft text-ok' },
  freemium: { label: 'Gratis con extras de pago', className: 'bg-warn-soft text-warn' },
  pago: { label: 'De pago', className: 'bg-red-soft text-red' },
};

export function AppCard({ app, highlight = false }: { app: App; highlight?: boolean }) {
  const cost = COST_LABEL[app.costo];
  return (
    <article id={app.id} className={`card flex h-full flex-col gap-3 p-5 ${highlight ? 'border-red ring-1 ring-red/30' : ''}`}>
      <div className="flex items-start gap-3">
        <AreaTile area={app.areas[0] ?? 'tecnologia'} />
        <div className="min-w-0">
          <h3 className="font-semibold">{app.nombre}</h3>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[0.72rem] font-semibold ${cost.className}`}>{cost.label}</span>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-ink-2">{app.para_que}</p>
      {app.nota ? <p className="text-xs text-muted">{app.nota}</p> : null}
      <p className="text-xs text-muted">{app.plataformas.join(' · ')}</p>
      <a href={app.url_oficial} target="_blank" rel="noopener noreferrer" className="link-red mt-auto inline-flex items-center gap-1 text-sm">
        Sitio oficial <Icon name="external" size={15} />
      </a>
      <p className="text-[0.7rem] text-muted">Verificado el {formatDate(app.fecha_consulta)}</p>
    </article>
  );
}

export default function AppsPage() {
  useDocumentTitle('Apps recomendadas');
  const [params] = useSearchParams();
  const highlight = params.get('a');
  const apps = useAsync(loadApps, []);
  return (
    <div>
      <PageHeader
        eyebrow="Herramientas"
        title="Apps que sirven de verdad"
        subtitle="Qué hace cada una, para qué asignatura sirve y si es gratis. Solo enlaces a sitios oficiales."
      />
      {apps.status !== 'ready' ? (
        <Skeleton lines={4} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {apps.data.map((app) => (
            <li key={app.id}>
              <AppCard app={app} highlight={highlight === app.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
