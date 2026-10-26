import { TOOLS } from '../../domain/tools/catalog';
import { areaLabel } from '../../ui/areas';
import { useDocumentTitle } from '../../ui/hooks';
import { Icon } from '../../ui/icons';
import { AppLink, PageHeader, TiltCard } from '../../ui/primitives';
import { TOOL_ICON } from '../../ui/tool-icons';

export default function ToolsPage() {
  useDocumentTitle('Herramientas');
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Herramientas"
        title="Practica cada materia con su propia herramienta"
        subtitle="Editor con fórmulas, libro diario, estadística, gráficas, simuladores y calculadoras con su base legal. Todo corre en tu teléfono; solo dos herramientas consultan datos abiertos en internet."
      />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool, i) => (
          <li key={tool.id} className="rise" style={{ animationDelay: `${40 + i * 30}ms` }}>
            <AppLink to={tool.ruta} className="block h-full">
              <TiltCard className="flex h-full flex-col gap-3 p-5">
                <span className="flex items-start justify-between gap-3">
                  <span className="tile">
                    <Icon name={TOOL_ICON[tool.id]} />
                  </span>
                  <span className="chip text-xs">{tool.enLinea ? 'Con conexión' : 'Sin conexión'}</span>
                </span>
                <span className="font-display text-xl leading-tight font-semibold">{tool.nombre}</span>
                <span className="text-sm text-muted">{tool.descripcion}</span>
                <span className="mt-auto text-xs font-semibold tracking-wide text-muted uppercase">{areaLabel(tool.area)}</span>
              </TiltCard>
            </AppLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
