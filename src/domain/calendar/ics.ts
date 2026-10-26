/**
 * Builds an iCalendar file (RFC 5545) so a reminder can be added to the phone's own calendar: the phone, not a
 * server, will ring the alarm. Only the reminder title and date are included.
 */
export interface IcsReminder {
  id: string;
  titulo: string;
  fecha: string;
  avisoMinutos: number;
}

function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function toUtcStamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/** Lines longer than 75 octets are folded with CRLF + space (RFC 5545 §3.1). */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  for (const ch of line) {
    if (new TextEncoder().encode(current + ch).length > 74) {
      parts.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export function reminderToIcs(reminder: IcsReminder, now = new Date()): string {
  const start = new Date(reminder.fecha);
  if (Number.isNaN(start.getTime())) throw new Error('Fecha inválida');
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ABACO//Recordatorios//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${reminder.id}@abaco.local`,
    `DTSTAMP:${toUtcStamp(now)}`,
    `DTSTART:${toUtcStamp(start)}`,
    `DTEND:${toUtcStamp(end)}`,
    `SUMMARY:${escapeText(reminder.titulo)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(reminder.titulo)}`,
    `TRIGGER:-PT${Math.max(0, Math.round(reminder.avisoMinutos))}M`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
