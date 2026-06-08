import { useState } from 'react';
import { editFifaGame } from '../../api/fifaAdmin';
import styles from './UserModal.module.css';

const SELECT_STYLE = { padding:'8px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'0.9rem' };
const INPUT_STYLE  = { padding:'8px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'0.9rem', width:'100%', boxSizing:'border-box' };

// start_time uložený v UTC ('YYYY-MM-DD HH:MM:00'). Konvertuj na lokálny pre input.
function utcToLocalInputs(utcStr) {
    if (!utcStr) return { date: '', time: '' };
    const d = new Date(utcStr + 'Z');
    const pad = n => String(n).padStart(2, '0');
    return {
        date: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,
        time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    };
}
function localToUtc(date, time) {
    const d = new Date(`${date}T${time}`);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00`;
}

export default function FifaGameModal({ game, teams, onClose, onSaved }) {
    const isPlayoff = !game.game_type_code.startsWith('GROUP_');
    const { date: initDate, time: initTime } = utcToLocalInputs(game.start_time);

    const codeToId = {};
    teams.forEach(t => { codeToId[t.team_code] = t.team_id; });

    const [date,   setDate]   = useState(initDate);
    const [time,   setTime]   = useState(initTime);
    const [team1,  setTeam1]  = useState(game.home_team_id ? String(game.home_team_id) : (game.home_code ? String(codeToId[game.home_code] ?? '') : ''));
    const [team2,  setTeam2]  = useState(game.away_team_id ? String(game.away_team_id) : (game.away_code ? String(codeToId[game.away_code] ?? '') : ''));
    const [venue,  setVenue]  = useState(game.venue || '');
    const [status, setStatus] = useState(game.result_approved ? 'finished' : 'scheduled');
    const [h90,    setH90]    = useState(game.home_score_regular != null ? String(game.home_score_regular) : '');
    const [a90,    setA90]    = useState(game.away_score_regular != null ? String(game.away_score_regular) : '');
    const [hasET,  setHasET]  = useState(game.home_score_final != null);
    const [hFin,   setHFin]   = useState(game.home_score_final != null ? String(game.home_score_final) : '');
    const [aFin,   setAFin]   = useState(game.away_score_final != null ? String(game.away_score_final) : '');
    const [fsUrl,  setFsUrl]  = useState(game.flashscore_url || '');
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState('');
    const [success, setSuccess] = useState('');

    const showScore = status === 'finished';
    const isDraw90  = h90 !== '' && a90 !== '' && parseInt(h90) === parseInt(a90);
    const needsET   = showScore && isPlayoff && isDraw90;  // play-off remíza → povinný víťaz po ET

    // Keď vznikne remíza v play-off a polia konečného skóre sú prázdne, predvyplň ich hodnotou po 90 min
    const onH90Change = (val) => {
        setH90(val);
        if (isPlayoff && val !== '' && a90 !== '' && parseInt(val) === parseInt(a90)) {
            if (hFin === '') setHFin(val);
            if (aFin === '') setAFin(a90);
        }
    };
    const onA90Change = (val) => {
        setA90(val);
        if (isPlayoff && h90 !== '' && val !== '' && parseInt(h90) === parseInt(val)) {
            if (hFin === '') setHFin(h90);
            if (aFin === '') setAFin(val);
        }
    };

    const save = async () => {
        if (needsET) {
            if (hFin === '' || aFin === '') { setError('Remíza v play-off — zadaj konečný výsledok (po ET/penaltách)'); return; }
            const H90 = +h90, A90 = +a90, HF = +hFin, AF = +aFin;
            if (HF < H90 || AF < A90) { setError('Konečný výsledok nemôže byť nižší ako po 90 min'); return; }
            if (HF === AF) { setError('Po ET/penaltách musí byť víťaz (nie remíza)'); return; }
        }
        setSaving(true); setError(''); setSuccess('');
        try {
            const payload = {
                game_id: game.game_id,
                venue,
                flashscore_url: fsUrl || null,
                home_team_id: team1 || null,
                away_team_id: team2 || null,
                status,
            };
            if (date && time) payload.start_time = localToUtc(date, time);
            if (showScore) {
                payload.home_score_regular = h90 !== '' ? parseInt(h90) : null;
                payload.away_score_regular = a90 !== '' ? parseInt(a90) : null;
                payload.home_score_final = needsET ? parseInt(hFin) : null;
                payload.away_score_final = needsET ? parseInt(aFin) : null;
            }
            await editFifaGame(payload);
            onSaved();
            onClose();
        } catch (e) { setError(e.message); setSaving(false); }
    };

    return (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3>Zápas #{game.game_id} – {game.home_code || 'TBD'} vs {game.away_code || 'TBD'}</h3>
                    <button className={styles.close} onClick={onClose}>✕</button>
                </div>

                <div className={styles.section}>
                    <h4>Dátum a čas</h4>
                    <div className={styles.grid}>
                        <label>Dátum
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={SELECT_STYLE} />
                        </label>
                        <label>Čas
                            <input type="time" value={time} onChange={e => setTime(e.target.value)} style={SELECT_STYLE} />
                        </label>
                    </div>
                </div>

                <div className={styles.section}>
                    <h4>Tímy</h4>
                    <div className={styles.grid}>
                        <label>Domáci
                            <select value={team1} onChange={e => setTeam1(e.target.value)} style={SELECT_STYLE}>
                                <option value="">TBD</option>
                                {teams.map(t => <option key={t.team_id} value={t.team_id}>{t.team_code} – {t.team_name}</option>)}
                            </select>
                        </label>
                        <label>Hostia
                            <select value={team2} onChange={e => setTeam2(e.target.value)} style={SELECT_STYLE}>
                                <option value="">TBD</option>
                                {teams.map(t => <option key={t.team_id} value={t.team_id}>{t.team_code} – {t.team_name}</option>)}
                            </select>
                        </label>
                    </div>
                </div>

                <div className={styles.section}>
                    <h4>Stav</h4>
                    <div className={styles.grid}>
                        <label>Status
                            <select value={status} onChange={e => setStatus(e.target.value)} style={SELECT_STYLE}>
                                <option value="scheduled">Plánovaný</option>
                                <option value="finished">Odohraný</option>
                            </select>
                        </label>
                        {showScore && <>
                            <label>Domáci – góly (90 min)
                                <input type="number" min="0" max="30" value={h90} onChange={e => onH90Change(e.target.value)} style={SELECT_STYLE} />
                            </label>
                            <label>Hostia – góly (90 min)
                                <input type="number" min="0" max="30" value={a90} onChange={e => onA90Change(e.target.value)} style={SELECT_STYLE} />
                            </label>
                        </>}
                    </div>
                    {needsET && (
                        <div style={{marginTop:10}}>
                            <p style={{fontSize:'0.82rem', color:'#dc3545', margin:'0 0 6px'}}>
                                Remíza v play-off → zadaj víťaza po predĺžení/penaltách:
                            </p>
                            <div className={styles.grid} style={{marginTop:0}}>
                                <label>Domáci – konečné
                                    <input type="number" min="0" max="30" value={hFin} onChange={e => setHFin(e.target.value)} style={SELECT_STYLE} />
                                </label>
                                <label>Hostia – konečné
                                    <input type="number" min="0" max="30" value={aFin} onChange={e => setAFin(e.target.value)} style={SELECT_STYLE} />
                                </label>
                            </div>
                            <p style={{fontSize:'0.72rem', color:'#aaa', margin:'6px 0 0'}}>
                                Tip sa hodnotí podľa skóre po 90 min. Konečný výsledok je len informačný.
                            </p>
                        </div>
                    )}
                </div>

                <div className={styles.section}>
                    <h4>Štadión</h4>
                    <input value={venue} onChange={e => setVenue(e.target.value)} style={INPUT_STYLE} />
                </div>

                <div className={styles.section}>
                    <h4>FlashScore link</h4>
                    <input value={fsUrl} onChange={e => setFsUrl(e.target.value)}
                        placeholder="https://www.flashscore.sk/zapas/futbal/..." style={INPUT_STYLE} />
                </div>

                <button className={styles.btn} onClick={save} disabled={saving}>
                    {saving ? 'Ukladám…' : 'Uložiť'}
                </button>
                {error   && <p className={styles.error}>{error}</p>}
                {success && <p className={styles.success}>{success}</p>}
            </div>
        </div>
    );
}
