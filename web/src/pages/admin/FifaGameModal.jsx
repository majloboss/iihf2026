import { useState } from 'react';
import { editFifaGame } from '../../api/fifaAdmin';
import styles from './UserModal.module.css';

const SELECT_STYLE = { padding:'8px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'0.9rem' };
const INPUT_STYLE  = { padding:'8px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'0.9rem', width:'100%', boxSizing:'border-box' };

// start_time je uložený v UTC ('YYYY-MM-DD HH:MM:00'). Konvertuj na lokálny pre input.
function utcToLocalInputs(utcStr) {
    if (!utcStr) return { date: '', time: '' };
    const d = new Date(utcStr + 'Z');
    const pad = n => String(n).padStart(2, '0');
    return {
        date: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,
        time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    };
}
// Lokálny dátum+čas → UTC string 'YYYY-MM-DD HH:MM:00'
function localToUtc(date, time) {
    const d = new Date(`${date}T${time}`);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00`;
}

export default function FifaGameModal({ game, teams, onClose, onSaved }) {
    const isGroup = game.game_type_code.startsWith('GROUP_');
    const { date: initDate, time: initTime } = utcToLocalInputs(game.start_time);
    const [date,  setDate]  = useState(initDate);
    const [time,  setTime]  = useState(initTime);
    const [venue, setVenue] = useState(game.venue || '');
    const [homeId, setHomeId] = useState(game.home_team_id ? String(game.home_team_id) : '');
    const [awayId, setAwayId] = useState(game.away_team_id ? String(game.away_team_id) : '');
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState('');

    // Doplň team_id ak ho game nemá (z teams podľa kódu)
    const codeToId = {};
    teams.forEach(t => { codeToId[t.team_code] = t.team_id; });
    const curHomeId = homeId || (game.home_code ? String(codeToId[game.home_code] ?? '') : '');
    const curAwayId = awayId || (game.away_code ? String(codeToId[game.away_code] ?? '') : '');

    const save = async () => {
        setSaving(true); setError('');
        try {
            const payload = { game_id: game.game_id, venue };
            if (date && time) payload.start_time = localToUtc(date, time);
            if (!isGroup) {
                payload.home_team_id = curHomeId || null;
                payload.away_team_id = curAwayId || null;
            }
            await editFifaGame(payload);
            onSaved();
            onClose();
        } catch (e) { setError(e.message); }
        finally { setSaving(false); }
    };

    return (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3>Zápas #{game.game_id} – {game.home_code || 'TBD'} vs {game.away_code || 'TBD'}</h3>
                    <button className={styles.close} onClick={onClose}>✕</button>
                </div>

                <div className={styles.section}>
                    <h4>Dátum a čas (lokálny)</h4>
                    <div className={styles.grid}>
                        <label>Dátum
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={SELECT_STYLE} />
                        </label>
                        <label>Čas
                            <input type="time" value={time} onChange={e => setTime(e.target.value)} style={SELECT_STYLE} />
                        </label>
                    </div>
                </div>

                {!isGroup && (
                    <div className={styles.section}>
                        <h4>Tímy (play-off)</h4>
                        <div className={styles.grid}>
                            <label>Domáci
                                <select value={curHomeId} onChange={e => setHomeId(e.target.value)} style={SELECT_STYLE}>
                                    <option value="">TBD</option>
                                    {teams.map(t => <option key={t.team_id} value={t.team_id}>{t.team_code} – {t.team_name}</option>)}
                                </select>
                            </label>
                            <label>Hostia
                                <select value={curAwayId} onChange={e => setAwayId(e.target.value)} style={SELECT_STYLE}>
                                    <option value="">TBD</option>
                                    {teams.map(t => <option key={t.team_id} value={t.team_id}>{t.team_code} – {t.team_name}</option>)}
                                </select>
                            </label>
                        </div>
                    </div>
                )}

                <div className={styles.section}>
                    <h4>Štadión</h4>
                    <input value={venue} onChange={e => setVenue(e.target.value)} style={INPUT_STYLE} />
                </div>

                <button className={styles.btn} onClick={save} disabled={saving}>
                    {saving ? 'Ukladám…' : 'Uložiť'}
                </button>
                {error && <p className={styles.error}>{error}</p>}
            </div>
        </div>
    );
}
