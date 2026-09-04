import { getUclGames } from '../../api/ucl';
import AdminGamesScreen from '../../components/AdminGamesScreen';
import UclGameModal from './UclGameModal';

// Zoznam zápasov UCL. Samotná obrazovka je spoločná pre všetky súťaže
// (`AdminGamesScreen`); tu sa doplní len to, čím sa UCL líši — kluby
// s logami namiesto reprezentácií s vlajkami.

// start_time je naive UTC, preto sa dopĺňa 'Z'.
const asDate = s => new Date(String(s).replace(' ', 'T') + 'Z');
const casFmt = new Intl.DateTimeFormat('sk-SK',
    { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
const format = (s) => {
    const d = asDate(s);
    return Number.isNaN(d.getTime()) ? '—' : casFmt.format(d);
};

const MAPOVANIE = {
    id: 'game_id',
    cas: 'start_time',
    staraFaza: 'game_type_code',
    formatCasu: format,

    // Kluby sa označujú názvom a logom, nie kódom a vlajkou.
    domaci: g => ({ popis: g.home_name,
                    obrazok: g.home_logo ? `/logos/ucl2026/${g.home_logo}` : null }),
    hostia: g => ({ popis: g.away_name,
                    obrazok: g.away_logo ? `/logos/ucl2026/${g.away_logo}` : null }),

    vysledok: g => g.home_score_regular != null
        ? `${g.home_score_regular}:${g.away_score_regular}` : null,

    // Zápas, ktorý sa už začal, ale nemá schválený výsledok, beží.
    stav: g => g.result_approved ? 'finished'
        : asDate(g.start_time) <= new Date() ? 'live'
        : 'scheduled',
};

export default function UclAdminGames() {
    return (
        <AdminGamesScreen
            mapovanie={MAPOVANIE}
            nacitat={getUclGames}
            editor={(zapas, zavri, znovuNacitaj) => (
                <UclGameModal game={zapas} onClose={zavri}
                              onSaved={znovuNacitaj} />
            )}
        />
    );
}
