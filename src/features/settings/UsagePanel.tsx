import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { listUsage } from '../../data/everyday-repositories';
import { NORMATIVA } from '../../domain/content/normativa';
import { vigenciaStatus } from '../../domain/content/vigencia';
import { anonymousSummary, usageMetrics } from '../../domain/usage/metrics';
import { Icon } from '../../ui/icons';
import { AppLink } from '../../ui/primitives';
import { useToday } from '../../ui/use-vigencia';
import { useToast } from '../../ui/use-toast';
import { copyText } from '../../ui/clipboard';

/** «Tu uso»: what ÁBACO counts on this device, shown to the student, who alone decides whether to share it. */
export function UsagePanel() {
  const days = useLiveQuery(() => listUsage(), [], []);
  const today = useToday();
  const toast = useToast();
  const metrics = useMemo(() => {
    const vencidas = NORMATIVA.filter((c) => vigenciaStatus(c.vigencia, today).estado === 'vencida').length;
    return usageMetrics(days ?? [], today, vencidas);
  }, [days, today]);

  const copy = async () => {
    try {
      await copyText(anonymousSummary(metrics));
      toast.show('Resumen copiado: solo tiene números, sin fechas ni datos tuyos.');
    } catch {
      toast.show('Tu navegador no permitió copiar el resumen.', 'error');
    }
  };

  const items: [string, string][] = [
    ['Días de uso este mes', String(metrics.diasActivosMes)],
    ['Entregables este mes', String(metrics.entregablesMes)],
    ['Exportaciones este mes', String(metrics.exportacionesMes)],
    ['Exámenes de práctica este mes', String(metrics.examenesMes)],
    [
      'Volviste la semana siguiente',
      metrics.volvioLaSemanaSiguiente === null ? 'Aún no' : metrics.volvioLaSemanaSiguiente ? 'Sí' : 'No',
    ],
    ['Semanas con uso (últimas 4)', String(metrics.semanasActivasUltimas4)],
    [
      'Colecciones y talleres compartidos',
      String(metrics.coleccionesCompartidas + metrics.talleresCompartidos),
    ],
    ['Cifras normativas vencidas', String(metrics.cifrasVencidas)],
  ];

  return (
    <section className="card space-y-4 p-5" aria-labelledby="uso">
      <div>
        <h2 id="uso" className="font-display text-xl font-semibold">
          Tu uso
        </h2>
        <p className="mt-1 text-sm text-muted">
          ÁBACO cuenta, solo en este dispositivo, cuántas veces haces cada cosa por día; nunca qué escribiste.
          Nadie más lo ve. Si quieres ayudar a mejorar la app, copia el resumen anónimo y envíalo por el
          buzón.
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {items.map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted">{label}</dt>
            <dd className="tnum font-display text-xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-soft" onClick={() => void copy()}>
          <Icon name="copy" size={18} /> Copiar resumen anónimo
        </button>
        <AppLink to="/sugerencias" className="btn btn-ghost">
          Ir al buzón de sugerencias
        </AppLink>
      </div>
    </section>
  );
}
