import { getDb, type AbacoDB } from './db';
import { getMeta, setMeta } from './repositories';

/** Kept apart from backup.ts so the 15-day reminder does not pull the backup validators into the first load. */
export const BACKUP_REMINDER_DAYS = 15;

export async function markBackupDone(db: AbacoDB = getDb(), nowDate = new Date()): Promise<void> {
  await setMeta('lastBackupAt', nowDate.toISOString(), db);
}

/** True when the student has data and no backup in the last 15 days. */
export function needsBackupReminder(lastBackupAt: string | undefined, hasData: boolean, nowDate = new Date()): boolean {
  if (!hasData) return false;
  if (!lastBackupAt) return true;
  const last = new Date(lastBackupAt).getTime();
  if (Number.isNaN(last)) return true;
  return nowDate.getTime() - last >= BACKUP_REMINDER_DAYS * 24 * 60 * 60 * 1000;
}

export async function shouldRemindBackup(db: AbacoDB = getDb(), nowDate = new Date()): Promise<boolean> {
  const counts = await Promise.all([db.apuntes.count(), db.colecciones.count(), db.hojas.count(), db.estrellas.count()]);
  return needsBackupReminder(await getMeta<string>('lastBackupAt', db), counts.some((c) => c > 0), nowDate);
}
