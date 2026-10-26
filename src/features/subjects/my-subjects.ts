import { updateProfile } from '../../data/repositories';

/** Adds or removes a subject from the student's own list ("mis materias"), stored only on this device. */
export async function toggleMySubject(current: string[], materiaId: string): Promise<boolean> {
  const has = current.includes(materiaId);
  await updateProfile({ materias: has ? current.filter((id) => id !== materiaId) : [...current, materiaId] });
  return !has;
}
