import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  appsFileSchema,
  carrerasFileSchema,
  ejerciciosFileSchema,
  formulasFileSchema,
  fuentesFileSchema,
  glosarioFileSchema,
  indicadoresFileSchema,
  materiasFileSchema,
  normativaFileSchema,
  plantillasFileSchema,
  recursosFileSchema,
  temarioSchema,
} from '../../src/domain/content/schemas';

export const CONTENT_ROOT = join(__dirname, '..', '..', 'content');
const read = (file: string): unknown => JSON.parse(readFileSync(join(CONTENT_ROOT, file), 'utf8'));
const listJson = (dir: string): string[] =>
  readdirSync(join(CONTENT_ROOT, dir))
    .filter((f) => f.endsWith('.json'))
    .sort();

/** Loads and validates every content file. Any schema violation fails the whole content suite. */
export function loadAllContent() {
  const fuentes = fuentesFileSchema.parse(read('fuentes.json'));
  const materias = materiasFileSchema.parse(read('materias.json'));
  const carreras = carrerasFileSchema.parse(read('carreras.json'));
  const temarios = listJson('temarios').map((file) => ({ file, data: temarioSchema.parse(read(`temarios/${file}`)) }));
  const formulas = formulasFileSchema.parse(read('formulas.json'));
  const ejercicios = ejerciciosFileSchema.parse(read('ejercicios.json'));
  const apps = appsFileSchema.parse(read('apps.json'));
  const recursos = recursosFileSchema.parse(read('recursos.json'));
  const glosario = glosarioFileSchema.parse(read('glosario.json'));
  const plantillas = plantillasFileSchema.parse(read('plantillas.json'));
  const normativa = normativaFileSchema.parse(read('normativa.json'));
  const indicadores = indicadoresFileSchema.parse(read('indicadores.json'));
  return {
    fuentes,
    materias,
    carreras,
    temarios,
    formulas,
    ejercicios,
    apps,
    recursos,
    glosario,
    plantillas,
    normativa,
    indicadores,
  };
}

/** Every content file as raw text (used to look for forbidden material such as university curricula). */
export function allContentText(): { file: string; text: string }[] {
  const files = [
    ...readdirSync(CONTENT_ROOT).filter((f) => f.endsWith('.json')),
    ...listJson('temarios').map((f) => `temarios/${f}`),
  ];
  return files.map((file) => ({ file, text: readFileSync(join(CONTENT_ROOT, file), 'utf8') }));
}

export type AllContent = ReturnType<typeof loadAllContent>;
