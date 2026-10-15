import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  appsFileSchema,
  carrerasFileSchema,
  ejerciciosFileSchema,
  formulasFileSchema,
  fuentesFileSchema,
  glosarioFileSchema,
  mallaSchema,
  plantillasFileSchema,
  temarioSchema,
  universidadesFileSchema,
} from '../../src/domain/content/schemas';

const ROOT = join(__dirname, '..', '..', 'content');
const read = (file: string): unknown => JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
const listJson = (dir: string): string[] =>
  readdirSync(join(ROOT, dir))
    .filter((f) => f.endsWith('.json'))
    .sort();

/** Loads and validates every content file. Any schema violation fails the whole content suite. */
export function loadAllContent() {
  const fuentes = fuentesFileSchema.parse(read('fuentes.json'));
  const universidades = universidadesFileSchema.parse(read('universidades.json'));
  const carreras = carrerasFileSchema.parse(read('carreras.json'));
  const mallas = listJson('mallas').map((file) => ({ file, data: mallaSchema.parse(read(`mallas/${file}`)) }));
  const temarios = listJson('temarios').map((file) => ({ file, data: temarioSchema.parse(read(`temarios/${file}`)) }));
  const formulas = formulasFileSchema.parse(read('formulas.json'));
  const ejercicios = ejerciciosFileSchema.parse(read('ejercicios.json'));
  const apps = appsFileSchema.parse(read('apps.json'));
  const glosario = glosarioFileSchema.parse(read('glosario.json'));
  const plantillas = plantillasFileSchema.parse(read('plantillas.json'));
  return { fuentes, universidades, carreras, mallas, temarios, formulas, ejercicios, apps, glosario, plantillas };
}

export type AllContent = ReturnType<typeof loadAllContent>;
