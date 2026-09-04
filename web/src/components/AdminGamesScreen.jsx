import { useEffect, useState } from 'react';
import usePhases from '../hooks/usePhases';
import { useCompetition } from '../context/CompetitionContext';
import AdminGamesTable from '../pages/admin/AdminGamesTable';
import PhaseFilter from './PhaseFilter';

// Zoznam zápasov v admine — spoločný pre všetky súťaže.
//
// Každá súťaž mala vlastnú obrazovku s tým istým obsahom: filter fáz, tabuľka
// a editor. Líšili sa len názvy stĺpcov a to, odkiaľ sa berú vlajky či logá.
// Rozdiely preto opisuje `mapovanie`, ktoré dodá volajúca obrazovka.
//
// Fázy vo filtri aj skratky v tabuľke určuje číselník, nie zoznam v kóde.

export default function AdminGamesScreen({
    mapovanie,        // názvy polí zápasu, ktoré sa medzi súťažami líšia
    nacitat,          // () => Promise<zápasy>
    editor,           // (zápas, zavri, ulozene) => JSX
}) {
    const M = mapovanie;
    const { activeCompetition } = useCompetition();
    const { fazy, sediFaze } = usePhases(activeCompetition?.id);

    const [zapasy, setZapasy]   = useState([]);
    const [faza, setFaza]       = useState('all');
    const [editovany, setEdit]  = useState(null);
    const [nacitava, setNacita] = useState(true);
    const [chyba, setChyba]     = useState('');

    const nacitajZapasy = () => nacitat()
        .then(d => { setZapasy(d); setChyba(''); })
        .catch(e => setChyba(e.message))
        .finally(() => setNacita(false));

    useEffect(() => { nacitajZapasy(); }, []);   // eslint-disable-line react-hooks/exhaustive-deps

    // Skratka kola z číselníka — prázdna, kým zápas nie je naviazaný.
    const kodFazy = (g) => g.match_stat_code ?? null;


    const popisFazy = (kod) => fazy.find(f => f.code === kod)?.label ?? kod;

    const filtrovane = faza === 'all' ? zapasy
        : zapasy.filter(g => sediFaze(kodFazy(g), faza));

    if (nacitava) return <p>Načítavam…</p>;
    if (chyba)    return <p style={{ color: 'red' }}>Chyba: {chyba}</p>;

    const bunkaTimu = (tim) => tim?.popis
        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {tim.obrazok && <img src={tim.obrazok} alt=""
                   style={{ width: 22, height: 14, borderRadius: 2, objectFit: 'contain' }}
                   onError={e => { e.currentTarget.style.display = 'none'; }} />}
              {tim.popis}
          </span>
        : <span style={{ color: '#aaa' }}>TBD</span>;

    return (
        <div>
            {/* Rovnaké farebné ikony ako v používateľských Zápasoch —
                skratky, farby aj zbaľovanie určuje číselník. */}
            <div style={{ margin: '4px 0 14px' }}>
                <PhaseFilter competitionId={activeCompetition?.id}
                             hodnota={faza === 'all' ? '' : faza}
                             onZmena={kod => setFaza(kod === '' ? 'all' : kod)} />
            </div>

            <AdminGamesTable
                rows={filtrovane.map(g => ({
                    key: g[M.id],
                    number: M.cislo ? g[M.cislo] : g[M.id],
                    phaseLabel: kodFazy(g) ? popisFazy(kodFazy(g)) : null,
                    dateLocal: M.formatCasu(g[M.cas]),
                    homeCell: bunkaTimu(M.domaci(g)),
                    awayCell: bunkaTimu(M.hostia(g)),
                    result: M.vysledok(g),
                    venue: g.venue,
                    status: M.stav(g),
                    flashscore_url: g.flashscore_url,
                    raw: g,
                }))}
                onEdit={setEdit}
            />

            {editovany && editor(editovany, () => setEdit(null), nacitajZapasy)}
        </div>
    );
}
