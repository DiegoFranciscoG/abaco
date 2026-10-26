/**
 * Copies text to the clipboard. `navigator.clipboard` only exists in secure contexts (HTTPS or localhost); on a
 * phone that opens the app over the local network it is missing, so a hidden text area and the older copy
 * command take over. Throws when neither works, so the caller can say so.
 */
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Permission denied or not focused: try the fallback below.
    }
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  if (!ok) throw new Error('No se pudo copiar');
}
