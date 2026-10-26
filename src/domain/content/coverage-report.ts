/**
 * docs/cobertura.md, generated from the content by `npm run cobertura` (test T-17 checks it is up to date).
 * Type-only imports so the Node script can load it.
 */
import type { CoverageReport } from './coverage';
import type { Carrera, Materia, Repeticion } from './schemas';

const pct = (x: number) => `${Math.round(x * 100)} %`;

export function coverageMarkdown(input: {
  materias: Materia[];
  carreras: Carrera[];
  reports: ReadonlyMap<string, CoverageReport>;
  repeticion: Repeticion[];
}): string {
  const { materias, carreras, reports, repeticion } = input;
  const careersOf = (id: string) => repeticion.find((r) => r.materia === id)?.carreras ?? 0;
  const ordered = [...materias].sort((a, b) => careersOf(b.id) - careersOf(a.id) || a.nombre.localeCompare(b.nombre, 'es'));
  const completas = materias.filter((m) => m.cobertura.estado === 'completa').length;
  const lines: string[] = [
    '# Cobertura del contenido',
    '',
    'Generado con `npm run cobertura` a partir de `content/`. No se edita a mano: la prueba T-17 comprueba que coincide con el contenido y que ninguna materia se declara completa sin cumplir el estándar.',
    '',
    '## Estándar de profundidad',
    '',
    '- Cada materia tiene de 5 a 7 unidades (temas) y cada unidad de 4 a 6 subtemas, es decir, de 20 a 42 subtemas.',
    '- Cada subtema tiene teoría y un ejemplo con cifras de Ecuador (lo exige el esquema).',
    '- Cada subtema de cálculo (con fórmulas) tiene al menos 2 ejercicios con respuesta verificable.',
    '- Los subtemas conceptuales se practican con las preguntas que el área de estudio arma con su ejemplo, sus puntos clave y sus errores frecuentes.',
    '',
    `## Estado por materia (${completas} completas de ${materias.length})`,
    '',
    '| Materia | Carreras | Estado | Unidades | Subtemas | Cálculo con 2 ejercicios | Avance | Lo que falta |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const m of ordered) {
    const r = reports.get(m.id);
    if (!r) continue;
    lines.push(
      `| ${m.nombre} | ${careersOf(m.id)} de 7 | ${m.cobertura.estado} | ${r.unidades} de ${r.unidadesObjetivo} | ${r.subtemas} | ${r.subtemasCalculoConPractica} de ${r.subtemasCalculo} | ${pct(r.avance)} | ${r.faltantes.length === 0 ? '—' : r.faltantes.length === 1 ? r.faltantes[0] : `${r.faltantes[0]} (y ${r.faltantes.length - 1} ${r.faltantes.length === 2 ? 'punto' : 'puntos'} más)`} |`,
    );
  }
  lines.push(
    '',
    '## Mapa de repetición',
    '',
    'En cuántas carreras genéricas (de 7) y planes públicos (de 13) aparece cada asignatura, con los nombres normalizados (sin tildes, mayúsculas ni numeración I/II/III). Las que aparecen en 3 o más carreras son la prioridad. Solo se listan las que están en 2 o más carreras.',
    '',
    '| Asignatura | Carreras | Planes | Ciclo habitual | En ÁBACO |',
    '|---|---|---|---|---|',
  );
  for (const r of repeticion) {
    const m = r.materia ? materias.find((x) => x.id === r.materia) : undefined;
    lines.push(
      `| ${r.nombre}${r.tipo === 'practica' ? ' (práctica o titulación)' : ''} | ${r.carreras} | ${r.planes} | ${r.ciclo_habitual} | ${m ? m.nombre : r.tipo === 'practica' ? 'no aplica' : 'pendiente'} |`,
    );
  }
  lines.push('', '## Por carrera y ciclo', '');
  for (const c of carreras) {
    lines.push(`### ${c.nombre} (${c.planes} ${c.planes === 1 ? 'plan' : 'planes'})`, '');
    const cycles = new Set([...c.materias.map((e) => e.ciclo), ...(c.pendientes ?? []).map((p) => p.ciclo)]);
    for (const ciclo of [...cycles].sort((a, b) => a - b)) {
      const inAbaco = c.materias
        .filter((e) => e.ciclo === ciclo)
        .map((e) => {
          const r = reports.get(e.materia);
          const m = materias.find((x) => x.id === e.materia);
          return `${m?.nombre ?? e.materia} (${m?.cobertura.estado ?? '?'}, ${r?.unidades ?? 0} de ${r?.unidadesObjetivo ?? 6} unidades)`;
        });
      const pending = (c.pendientes ?? []).filter((p) => p.ciclo === ciclo).map((p) => p.nombre);
      const parts = [
        inAbaco.length > 0 ? `en ÁBACO: ${inAbaco.join('; ')}` : 'ninguna materia en ÁBACO',
        pending.length > 0 ? `pendientes: ${pending.join(', ')}` : 'sin pendientes',
      ];
      lines.push(`- **${ciclo}.º ciclo**: ${parts.join(' · ')}.`);
    }
    lines.push('');
  }
  const big = [...carreras].sort((a, b) => b.planes - a.planes).slice(0, 4);
  const firstCycle = new Set(big.flatMap((c) => c.materias.filter((e) => e.ciclo === 1).map((e) => e.materia)));
  lines.push(
    '## Meta: primer ciclo de las cuatro carreras con más planes',
    '',
    `Carreras: ${big.map((c) => c.nombre).join(', ')}. Materias de su primer ciclo que ya están en ÁBACO:`,
    '',
  );
  for (const id of [...firstCycle].sort()) {
    const m = materias.find((x) => x.id === id);
    const r = reports.get(id);
    if (m && r) lines.push(`- ${m.nombre}: ${m.cobertura.estado}, avance ${pct(r.avance)}.`);
  }
  const pendingFirst = [...new Set(big.flatMap((c) => (c.pendientes ?? []).filter((p) => p.ciclo === 1).map((p) => p.nombre)))].sort((a, b) => a.localeCompare(b, 'es'));
  lines.push('', `Asignaturas de ese primer ciclo que ÁBACO no tiene todavía: ${pendingFirst.length > 0 ? pendingFirst.join(', ') : 'ninguna'}.`, '');
  return lines.join('\n');
}
