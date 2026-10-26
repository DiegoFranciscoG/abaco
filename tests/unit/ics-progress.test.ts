import { describe, expect, it } from 'vitest';
import { reminderToIcs } from '../../src/domain/calendar/ics';
import { accuracyBySubject, summarizeAttempts } from '../../src/features/practice/progress';

describe('reminder to iCalendar', () => {
  const ics = reminderToIcs(
    {
      id: 'abc',
      titulo: 'Entregar taller; Costos, grupo 2',
      fecha: '2026-11-03T15:00:00.000Z',
      avisoMinutos: 120,
    },
    new Date('2026-10-15T12:00:00Z'),
  );

  it('produces a valid VEVENT with an alarm', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('DTSTART:20261103T150000Z');
    expect(ics).toContain('DTEND:20261103T153000Z');
    expect(ics).toContain('TRIGGER:-PT120M');
    expect(ics).toContain('UID:abc@abaco.local');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('escapes special characters and folds long lines', () => {
    expect(ics).toContain('SUMMARY:Entregar taller\\; Costos\\, grupo 2');
    const long = reminderToIcs({
      id: 'x',
      titulo: 'x'.repeat(200),
      fecha: '2026-11-03T15:00:00Z',
      avisoMinutos: 0,
    });
    expect(long.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75)).toBe(true);
  });

  it('rejects invalid dates', () => {
    expect(() => reminderToIcs({ id: 'x', titulo: 't', fecha: 'mañana', avisoMinutos: 10 })).toThrow();
  });
});

describe('practice progress', () => {
  const attempts = [
    { id: '1', ejercicioId: 'a', respuesta: 1, correcto: false, segundos: 10, fecha: '2026-10-01T10:00:00Z' },
    { id: '2', ejercicioId: 'a', respuesta: 2, correcto: true, segundos: 8, fecha: '2026-10-02T10:00:00Z' },
    { id: '3', ejercicioId: 'b', respuesta: 2, correcto: false, segundos: 8, fecha: '2026-10-03T10:00:00Z' },
  ];

  it('summarizes attempts per exercise', () => {
    const s = summarizeAttempts(attempts);
    expect(s.get('a')).toEqual({
      attempts: 2,
      solved: true,
      correctAttempts: 1,
      lastAt: '2026-10-02T10:00:00Z',
    });
    expect(s.get('b')?.solved).toBe(false);
  });

  it('computes accuracy per subject', () => {
    const acc = accuracyBySubject(attempts, (id) =>
      id === 'a' ? 'contabilidad' : id === 'b' ? 'estadistica' : undefined,
    );
    expect(acc.get('contabilidad')).toEqual({ attempts: 2, correct: 1 });
    expect(acc.get('estadistica')).toEqual({ attempts: 1, correct: 0 });
  });
});
