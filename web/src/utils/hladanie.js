// Porovnávanie textu pri vyhľadávaní.
//
// Hľadanie ignoruje veľkosť písmen aj diakritiku, takže "dansk" nájde
// "Dánsko" a "zilina" nájde "Žilina". Bez toho by používateľ musel trafiť
// presný tvar aj s mäkčeňmi, čo je pri slovenčine nepoužiteľné.

// Niektor\u00e9 p\u00edsmen\u00e1 sa v NFD nerozlo\u017eia, lebo ich znak nesie \u010diaru cez telo
// (pre\u0161krtnut\u00e9 o, d, l). Tie treba nahradi\u0165 ru\u010dne.
const ZVLASTNE = { '\u00f8': 'o', '\u0111': 'd', '\u00f0': 'd', '\u0142': 'l', '\u00df': 'ss', '\u00e6': 'ae', '\u0153': 'oe', '\u00fe': 'th' };

export const bezDiakritiky = s => String(s ?? '')
    .toLowerCase()
    .replace(/[\u00f8\u0111\u00f0\u0142\u00df\u00e6\u0153\u00fe]/g, ch => ZVLASTNE[ch] ?? ch)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/** Obsahuje `text` hľadaný výraz? Prázdny výraz vyhovuje vždy. */
export const obsahuje = (text, dopyt) => {
    const q = bezDiakritiky(dopyt).trim();
    return q === '' || bezDiakritiky(text).includes(q);
};

/** Vyhovuje aspoň jedna z hodnôt hľadanému výrazu? */
export const niektoreObsahuje = (hodnoty, dopyt) => {
    const q = bezDiakritiky(dopyt).trim();
    if (q === '') return true;
    return hodnoty.some(v => bezDiakritiky(v).includes(q));
};
