import { useEffect, useState } from 'react';
import { editUclGame } from '../../api/ucl';
import { getUclTeams } from '../../api/uclAdmin';
import GameEditor from '../../components/GameEditor';

// Úprava zápasu UCL. Samotný formulár je spoločný pre všetky súťaže
// (`GameEditor`); tu sa doplní len to, čím sa UCL líši — kluby namiesto
// reprezentácií, dvojzápasy a ručné zamykanie tipovania.

const MAPOVANIE = {
    cas: 'start_time',
    domaci: 'home_team_id',
    hostia: 'away_team_id',
    staraFaza: 'game_type_code',
    rozstrel: 'penalty',
    dvojzapas: true,
    tipovanie: true,
    nadpis: g => `Zápas #${g.game_id} – ${g.home_name || 'TBD'} vs ${g.away_name || 'TBD'}`,
};

// start_time je naive UTC; formulár posiela miestny čas, ktorý sa naň prepočíta.
const naUtc = (datum, cas) => {
    if (!datum || !cas) return undefined;
    const d = new Date(`${datum}T${cas}`);
    const p = n => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
           `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:00`;
};

export default function UclGameModal({ game, onClose, onSaved }) {
    const [kluby, setKluby] = useState([]);

    useEffect(() => {
        let zive = true;
        getUclTeams()
            .then(d => { if (zive) setKluby(
                d.map(k => ({ kod: String(k.team_id), nazov: k.team_name }))); })
            .catch(() => { if (zive) setKluby([]); });
        return () => { zive = false; };
    }, []);

    const uloz = async (z) => {
        await editUclGame({
            game_id: game.game_id,
            home_team_id: z.domaci,
            away_team_id: z.hostia,
            start_time: naUtc(z.datum, z.cas),
            venue: z.venue || '',
            phase_id: z.phase_id,
            flashscore_url: z.flashscore_url || '',
            tips_open: z.tips_open,
        });
        onSaved?.();
    };

    return (
        <GameEditor zapas={game} mapovanie={MAPOVANIE} timy={kluby}
                    onUlozit={uloz} onZavriet={onClose} />
    );
}
