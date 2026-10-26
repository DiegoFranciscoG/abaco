import { createHashRouter, type RouteObject } from 'react-router';
import { ErrorPage, NotFoundPage, Splash } from './Fallbacks';
import { Shell } from './Shell';

type PageModule = { default: React.ComponentType };
const page = (load: () => Promise<PageModule>): Pick<RouteObject, 'lazy'> => ({
  lazy: async () => ({ Component: (await load()).default }),
});

/**
 * Hash routes: they work on GitHub Pages without server rewrites and keep working offline from the
 * service worker cache. Every page is its own chunk.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    Component: Shell,
    ErrorBoundary: ErrorPage,
    HydrateFallback: Splash,
    children: [
      { index: true, ...page(() => import('../features/home/HomePage')) },
      { path: 'materias', ...page(() => import('../features/subjects/MateriasPage')) },
      { path: 'materia/:materiaId', ...page(() => import('../features/subjects/SubjectPage')) },
      { path: 'materia/:materiaId/tema/:temaId', ...page(() => import('../features/subjects/TopicPage')) },
      { path: 'herramientas', ...page(() => import('../features/tools/ToolsPage')) },
      { path: 'herramientas/:toolId', ...page(() => import('../features/tools/ToolPage')) },
      { path: 'formulas', ...page(() => import('../features/formulas/FormulasPage')) },
      { path: 'formulas/:formulaId', ...page(() => import('../features/formulas/FormulaPage')) },
      { path: 'laboratorio', ...page(() => import('../features/lab/LabHome')) },
      { path: 'laboratorio/:hojaId', ...page(() => import('../features/lab/LabSheetPage')) },
      { path: 'buscar', ...page(() => import('../features/search/AcademicSearchPage')) },
      { path: 'practica', ...page(() => import('../features/practice/PracticePage')) },
      { path: 'practica/:ejercicioId', ...page(() => import('../features/practice/ExercisePage')) },
      { path: 'mi-espacio', ...page(() => import('../features/me/MyPage')) },
      { path: 'coleccion/:coleccionId', ...page(() => import('../features/me/CollectionPage')) },
      { path: 'coleccion-compartida', ...page(() => import('../features/me/SharedCollectionPage')) },
      { path: 'apps', ...page(() => import('../features/apps/AppsPage')) },
      { path: 'glosario', ...page(() => import('../features/glossary/GlossaryPage')) },
      { path: 'ajustes', ...page(() => import('../features/settings/SettingsPage')) },
      { path: 'acerca', ...page(() => import('../features/about/AboutPage')) },
      { path: 'sugerencias', ...page(() => import('../features/suggestions/SuggestionsPage')) },
      { path: 'estudiar', ...page(() => import('../features/study/StudyPage')) },
      { path: 'enunciado', ...page(() => import('../features/statement/StatementPage')) },
      { path: 'cifras', ...page(() => import('../features/figures/FiguresPage')) },
      { path: 'cobertura', ...page(() => import('../features/cobertura/CoveragePage')) },
      { path: 'entregables', ...page(() => import('../features/deliverables/DeliverablesPage')) },
      {
        path: 'entregables/:entregableId',
        ...page(() => import('../features/deliverables/DeliverablePage')),
      },
      { path: 'legal/:docId', ...page(() => import('../features/legal/LegalPage')) },
      { path: '*', Component: NotFoundPage },
    ],
  },
];

export const router = createHashRouter(routes);
