/** Opens the visitor's mail app with a prepared message (a mailto: link; nothing is sent by ÁBACO). */
export function openMailApp(href: string): void {
  window.location.assign(href);
}
