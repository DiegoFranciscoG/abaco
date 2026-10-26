import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { Navigate, useParams } from 'react-router';
import { NotFoundPage } from '../../app/Fallbacks';
import type { ToolId } from '../../domain/content/schemas';
import { getTool, type ToolInfo } from '../../domain/tools/catalog';
import { Skeleton } from '../../ui/primitives';

type ToolComponent = LazyExoticComponent<ComponentType<{ tool: ToolInfo }>>;

/** Each tool is its own chunk: opening the payroll calculator never downloads the editor or the plotter. */
const COMPONENTS: Partial<Record<ToolId, ToolComponent>> = {
  editor: lazy(() => import('./editor/EditorTool')),
  diario: lazy(() => import('./journal/JournalTool')),
  estadistica: lazy(() => import('./stats/StatsTool')),
  graficador: lazy(() => import('./plotter/PlotterTool')),
  mercado: lazy(() => import('./market/MarketTool')),
  macro: lazy(() => import('./macro/MacroTool')),
  divisas: lazy(() => import('./fx/FxTool')),
  equilibrio: lazy(() => import('./finance/BreakEvenTool')),
  proyectos: lazy(() => import('./finance/ProjectsTool')),
  'rol-pagos': lazy(() => import('./payroll/PayrollTool')),
  impuestos: lazy(() => import('./tax/TaxTool')),
  foda: lazy(() => import('./swot/SwotTool')),
  tarjetas: lazy(() => import('./cards/CardsTool')),
  citas: lazy(() => import('./citations/CitationsTool')),
  notas: lazy(() => import('./grades/GradesTool')),
};

export default function ToolPage() {
  const { toolId = '' } = useParams();
  const tool = getTool(toolId);
  if (!tool) return <NotFoundPage />;
  const Component = COMPONENTS[tool.id];
  if (!Component) return <Navigate to={tool.ruta} replace />;
  return (
    <Suspense fallback={<Skeleton lines={6} />}>
      <Component tool={tool} />
    </Suspense>
  );
}
