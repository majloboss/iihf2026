import { editFifaGame } from '../../api/fifaAdmin';
import GameEditor from '../../components/GameEditor';

// Úprava zápasu FIFA. Samotný formulár je spoločný pre všetky súťaže
// (`GameEditor`); tu sa doplní len to, čím sa FIFA líši.

const MAPOVANIE = {
    cas: 'start_time',
    domaci: 'home_team_id',
    hostia: 'away_team_id',
    staraFaza: 'game_type_code',
    rozstrel: 'penalty',
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

export default function FifaGameModal({ game, teams = [], onClose, onSaved }) {
    const timy = teams.map(t => ({ kod: String(t.team_id), nazov: t.team_name }));

    const uloz = async (z) => {
        await editFifaGame({
            game_id: game.game_id,
            home_team_id: z.domaci,
            away_team_id: z.hostia,
            start_time: naUtc(z.datum, z.cas),
            venue: z.venue,
            phase_id: z.phase_id,
            flashscore_url: z.flashscore_url,
        });
        onSaved?.();
    };

    return (
        <GameEditor zapas={game} mapovanie={MAPOVANIE} timy={timy}
                    onUlozit={uloz} onZavriet={onClose} />
    );
}
