import { getGames } from '../../api/games';
import AdminGamesScreen from '../../components/AdminGamesScreen';
import GameModal from './GameModal';

// Zoznam zápasov IIHF. Samotná obrazovka je spoločná pre všetky súťaže
// (`AdminGamesScreen`); tu sa doplní len to, čím sa IIHF líši.

const format = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
           `${p(d.getHours())}:${p(d.getMinutes())}`;
};

// Vlajka sa skladá z kódu tímu podľa konvencie názvu súboru.
const vlajka = kod => kod ? `/flags/team_flag_${String(kod).toLowerCase()}.png` : null;

const MAPOVANIE = {
    id: 'id',
    cislo: 'game_number',
    cas: 'starts_at',
    staraFaza: 'phase',
    formatCasu: format,
    domaci: g => ({ popis: g.team1, obrazok: vlajka(g.team1) }),
    hostia: g => ({ popis: g.team2, obrazok: vlajka(g.team2) }),

    // Konečný stav po predĺžení sa píše ako „3:2 pp".
    vysledok: g => g.status === 'finished' && g.score1 != null
        ? (g.final1 != null && g.score1 === g.score2
            ? `${g.final1}:${g.final2} pp`
            : `${g.score1}:${g.score2}`)
        : null,

    // Zápas, ktorý sa už začal, ale nemá výsledok, beží.
    stav: g => g.status === 'finished' ? 'finished'
        : Date.now() >= new Date(g.starts_at).getTime() ? 'live'
        : 'scheduled',
};

export default function AdminGames() {
    return (
        <AdminGamesScreen
            mapovanie={MAPOVANIE}
            nacitat={getGames}
            editor={(zapas, zavri, znovuNacitaj) => (
                <GameModal game={zapas} onClose={zavri} onSaved={znovuNacitaj} />
            )}
        />
    );
}
