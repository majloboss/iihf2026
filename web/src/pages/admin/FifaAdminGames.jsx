import { useEffect, useState } from 'react';
import { getFifaGames } from '../../api/fifaGames';
import { getFifaTeams } from '../../api/fifaAdmin';
import AdminGamesScreen from '../../components/AdminGamesScreen';
import FifaGameModal from './FifaGameModal';

// Zoznam zápasov FIFA. Samotná obrazovka je spoločná pre všetky súťaže
// (`AdminGamesScreen`); tu sa doplní len to, čím sa FIFA líši.

const format = (cas) => {
    // start_time je naive UTC, preto sa dopĺňa 'Z'.
    const d = new Date(String(cas).replace(' ', 'T') + 'Z');
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit' })
        + ' ' + d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
};

// Vlajka sa skladá z kódu tímu podľa konvencie názvu súboru.
const vlajka = kod => kod ? `/flags/fifa_flag_${String(kod).toLowerCase()}.png` : null;

const MAPOVANIE = {
    id: 'game_id',
    cas: 'start_time',
    staraFaza: 'game_type_code',
    formatCasu: format,
    domaci: g => ({ popis: g.home_code, obrazok: vlajka(g.home_code) }),
    hostia: g => ({ popis: g.away_code, obrazok: vlajka(g.away_code) }),

    // Skupiny majú v zápasoch kód GROUP_A, v číselníku len A.
    prepisKodu: kod => String(kod ?? '').replace(/^GROUP_/, ''),

    vysledok: g => g.result_approved && g.home_score_regular != null
        ? `${g.home_score_regular}:${g.away_score_regular}` : null,
    stav: g => g.result_approved ? 'finished' : 'scheduled',
};

export default function FifaAdminGames() {
    const [timy, setTimy] = useState([]);

    useEffect(() => {
        let zive = true;
        getFifaTeams().then(d => { if (zive) setTimy(d); }).catch(() => {});
        return () => { zive = false; };
    }, []);

    return (
        <AdminGamesScreen
            mapovanie={MAPOVANIE}
            nacitat={getFifaGames}
            editor={(zapas, zavri, znovuNacitaj) => (
                <FifaGameModal game={zapas} teams={timy} onClose={zavri} onSaved={znovuNacitaj} />
            )}
        />
    );
}
