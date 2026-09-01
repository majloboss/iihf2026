import { useMemo, useState } from 'react';

// Triedenie tabuliek v admin číselníkoch.
//
// Klik na hlavičku zoradí podľa stĺpca, druhý klik otočí smer, tretí sa vráti
// k pôvodnému poradiu — údaje sú zo servera zoradené zmysluplne a niekedy sa
// treba vrátiť späť.

// Text sa porovnáva slovensky (ch, mäkčene), čísla ako čísla.
const collator = new Intl.Collator('sk', { numeric: true, sensitivity: 'base' });

function porovnaj(a, b) {
    // Prázdne hodnoty patria vždy na koniec, nech sa triedi ktorýmkoľvek smerom.
    const prazdne = v => v === null || v === undefined || v === '';
    if (prazdne(a) && prazdne(b)) return 0;
    if (prazdne(a)) return 1;
    if (prazdne(b)) return -1;

    if (typeof a === 'boolean' || typeof b === 'boolean') {
        return (b ? 1 : 0) - (a ? 1 : 0);
    }
    const cisloA = Number(a);
    const cisloB = Number(b);
    if (!Number.isNaN(cisloA) && !Number.isNaN(cisloB) && a !== '' && b !== '') {
        return cisloA - cisloB;
    }
    return collator.compare(String(a), String(b));
}

/**
 * @param {Array} rows      riadky na zobrazenie
 * @param {Object} accessors  { klucStlpca: riadok => hodnota }, keď nestačí rows[kluc]
 * @returns {{ sorted, sortKey, sortDir, toggleSort, sortIndicator }}
 */
export function useSortableTable(rows, accessors = {}) {
    const [sortKey, setSortKey] = useState(null);
    const [sortDir, setSortDir] = useState('asc');

    const toggleSort = key => {
        if (sortKey !== key) { setSortKey(key); setSortDir('asc'); return; }
        if (sortDir === 'asc') { setSortDir('desc'); return; }
        setSortKey(null);          // tretí klik zruší triedenie
        setSortDir('asc');
    };

    const sorted = useMemo(() => {
        if (!sortKey) return rows;
        const hodnota = accessors[sortKey] ?? (r => r[sortKey]);
        const smer = sortDir === 'asc' ? 1 : -1;
        // Kópia, aby sa nemenilo pole prichádzajúce zhora.
        return [...rows].sort((a, b) => smer * porovnaj(hodnota(a), hodnota(b)));
    }, [rows, sortKey, sortDir]);

    const sortIndicator = key => (sortKey !== key ? '' : sortDir === 'asc' ? ' ▲' : ' ▼');

    return { sorted, sortKey, sortDir, toggleSort, sortIndicator };
}

/** Hlavička, na ktorú sa dá kliknúť. */
export function SortableTh({ sortKey: key, onSort, indicator, children, ...rest }) {
    return (
        <th {...rest}
            onClick={() => onSort(key)}
            title="Kliknutím zoradíš"
            style={{ cursor: 'pointer', userSelect: 'none', ...(rest.style || {}) }}>
            {children}{indicator(key)}
        </th>
    );
}
