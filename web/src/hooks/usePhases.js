import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/client';

// Číselník fáz a kôl súťaže.
//
// Okrem samotného zoznamu vracia `sediFaze`, ktorá porovná zápas s hodnotou
// filtra. Filter totiž nesie buď kód kola (BAR-1), alebo kód celej skupiny
// (BAR) — a v druhom prípade patria do výberu všetky jej kolá.
//
// Bez toho by kliknutie na skupinu nezmenilo ani zoznam zápasov, ani ponuku
// hracích dní, kým by si človek nevybral konkrétne kolo.

export default function usePhases(competitionId) {
    const [fazy, setFazy] = useState([]);

    useEffect(() => {
        if (!competitionId) return;
        let zive = true;
        apiFetch(`v1/phases?competition_id=${competitionId}`)
            .then(d => { if (zive) setFazy(d); })
            .catch(() => { if (zive) setFazy([]); });
        return () => { zive = false; };
    }, [competitionId]);

    // Kód skupiny -> kódy jej kôl.
    const skupiny = useMemo(() => {
        const m = new Map();
        fazy.forEach(f => {
            if (!f.group) return;
            if (!m.has(f.group)) m.set(f.group, []);
            m.get(f.group).push(f.code);
        });
        return m;
    }, [fazy]);

    const sediFaze = useMemo(() => (kodZapasu, vyber) => {
        if (!vyber) return true;
        if (kodZapasu === vyber) return true;
        const kola = skupiny.get(vyber);
        return kola ? kola.includes(kodZapasu) : false;
    }, [skupiny]);

    return { fazy, skupiny, sediFaze };
}
