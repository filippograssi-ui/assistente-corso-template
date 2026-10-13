// Stesso pattern già usato in lib/scuola-eventi.js: il suggeritore e la lista
// di un ambito Svago sono due componenti React indipendenti senza stato
// condiviso. Quando il suggeritore aggiunge una voce scelta, la lista già
// montata non lo saprebbe da sola — da qui questo evento personalizzato per
// dirle di ricaricarsi subito invece di aspettare un refresh di pagina.
export const EVENTO_SVAGO_LISTA_AGGIORNATA = "svago:lista-aggiornata";

export function notificaSvagoListaAggiornata(ambito) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENTO_SVAGO_LISTA_AGGIORNATA, { detail: { ambito } }));
  }
}
