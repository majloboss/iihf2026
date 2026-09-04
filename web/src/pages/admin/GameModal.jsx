import { useEffect, useState } from 'react';
import { updateGame } from '../../api/admin';
import { apiFetch } from '../../api/client';
import GameEditor from '../../components/GameEditor';
import { useCompetition } from '../../context/CompetitionContext';

// Úprava zápasu IIHF. Samotný formulár je spoločný pre všetky súťaže
// (`GameEditor`); tu sa doplní len to, čím sa IIHF líši — názvy stĺpcov,
// zoznam tímov a spôsob uloženia.

const MAPOVANIE = {
    cas: 'starts_at',
    domaci: 'team1',
    hostia: 'team2',
    staraFaza: 'phase',
    popisDomaci: 'Tím 1',
    popisHostia: 'Tím 2',
    rozstrel: 'nájazdy',
    nadpis: g => `Zápas #${g.game_number} – ${g.team1 || 'TBD'} vs ${g.team2 || 'TBD'}`,
};

export default function GameModal({ game, onClose, onSaved }) {
    const { activeCompetition } = useCompetition();
    const [timy, setTimy] = useState([]);

    // Tímy boli predtým napísané natvrdo v kóde (16 reprezentácií). Teraz sa
    // čítajú z číselníka, takže sa nemusia dopĺňať pri každej zmene účastníkov.
    useEffect(() => {
        if (!activeCompetition?.id) return;
        let zive = true;
        // `v1/team-names` vracia mapu kód → názov a rieši všetky tri súťaže.
        // Bez `competition_id` vráti 400 a zoznam by zostal prázdny.
        apiFetch(`v1/team-names?competition_id=${activeCompetition.id}`)
            .then(d => { if (zive) setTimy(
                Object.entries(d).map(([kod, nazov]) => ({ kod, nazov: `${kod} – ${nazov}` }))
                    .sort((a, b) => a.nazov.localeCompare(b.nazov, 'sk'))); })
            .catch(() => { if (zive) setTimy([]); });
        return () => { zive = false; };
    }, [activeCompetition?.id]);

    const uloz = async (z) => {
        const starts_at = z.datum && z.cas
            ? new Date(`${z.datum}T${z.cas}`).toISOString() : undefined;
        const zmeny = {
            starts_at,
            team1: z.domaci,
            team2: z.hostia,
            venue: z.venue,
            phase_id: z.phase_id,
            flashscore_url: z.flashscore_url,
        };
        await updateGame(game.id, zmeny);
        onSaved({ ...game, ...zmeny, starts_at: starts_at ?? game.starts_at });
    };

    return (
        <GameEditor zapas={game} mapovanie={MAPOVANIE} timy={timy}
                    onUlozit={uloz} onZavriet={onClose} />
    );
}
