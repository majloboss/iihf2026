import { useState } from 'react';
import { updateGame } from '../../api/admin';
import styles from './UserModal.module.css';

const TEAMS = [
    { code: 'AUT', name: 'Austria' },
    { code: 'CAN', name: 'Canada' },
    { code: 'CZE', name: 'Czech Republic' },
    { code: 'DEN', name: 'Denmark' },
    { code: 'FIN', name: 'Finland' },
    { code: 'GER', name: 'Germany' },
    { code: 'GBR', name: 'Great Britain' },
    { code: 'HUN', name: 'Hungary' },
    { code: 'ITA', name: 'Italy' },
    { code: 'LAT', name: 'Latvia' },
    { code: 'NOR', name: 'Norway' },
    { code: 'SVK', name: 'Slovakia' },
    { code: 'SLO', name: 'Slovenia' },
    { code: 'SWE', name: 'Sweden' },
    { code: 'SUI', name: 'Switzerland' },
    { code: 'USA', name: 'United States' },
];

const SELECT_STYLE = { padding:'8px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'0.9rem' };
const INPUT_STYLE  = { padding:'8px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'0.9rem', width:'100%', boxSizing:'border-box' };

function toLocalDateTimeInputs(iso) {
    if (!iso) return { date: '', time: '' };
    const d = new Date(iso);
    if (isNaN(d)) return { date: '', time: '' };
    const pad = n => String(n).padStart(2, '0');
    return {
        date: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,
        time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    };
}

export default function GameModal({ game, onClose, onSaved }) {
    const { date: initDate, time: initTime } = toLocalDateTimeInputs(game.starts_at);
    const [date,   setDate]   = useState(initDate);
    const [time,   setTime]   = useState(initTime);
    const [team1,  setTeam1]  = useState(game.team1 || '');
    const [team2,  setTeam2]  = useState(game.team2 || '');
    const [venue,  setVenue]  = useState(game.venue || '');
    const [status, setStatus] = useState(game.status || 'scheduled');
    const [score1, setScore1] = useState(game.score1 != null ? String(game.score1) : '');
    const [score2, setScore2] = useState(game.score2 != null ? String(game.score2) : '');
    const [fsUrl,   setFsUrl]   = useState(game.flashscore_url || '');
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState('');
    const [success, setSuccess] = useState('');

    const showScore = status === 'live' || status === 'finished';

    const save = async () => {
        setSaving(true); setError(''); setSuccess('');
        try {
            const starts_at = date && time ? new Date(`${date}T${time}`).toISOString() : undefined;
            await updateGame(game.id, {
                starts_at,
                team1: team1 || null,
                team2: team2 || null,
                venue,
                status,
                score1: showScore && score1 !== '' ? parseInt(score1) : null,
                score2: showScore && score2 !== '' ? parseInt(score2) : null,
                flashscore_url: fsUrl || null,
            });
            setSuccess('Uložené.');
            onSaved({
                ...game,
                starts_at: starts_at ?? game.starts_at,
                team1: team1 || null,
                team2: team2 || null,
                venue,
                status,
                score1: showScore && score1 !== '' ? parseInt(score1) : null,
                score2: showScore && score2 !== '' ? parseInt(score2) : null,
                flashscore_url: fsUrl || null,
            });
        } catch (e) { setError(e.message); }
        finally { setSaving(false); }
    };

    return (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3>Zápas #{game.game_number} – {game.team1 || 'TBD'} vs {game.team2 || 'TBD'}</h3>
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
                        <label>Tím 1
                            <select value={team1} onChange={e => setTeam1(e.target.value)} style={SELECT_STYLE}>
                                <option value="">TBD</option>
                                {TEAMS.map(t => <option key={t.code} value={t.code}>{t.code} – {t.name}</option>)}
                            </select>
                        </label>
                        <label>Tím 2
                            <select value={team2} onChange={e => setTeam2(e.target.value)} style={SELECT_STYLE}>
                                <option value="">TBD</option>
                                {TEAMS.map(t => <option key={t.code} value={t.code}>{t.code} – {t.name}</option>)}
                            </select>
                        </label>
                    </div>
                </div>

                <div className={styles.section}>
                    <h4>Stav</h4>
                    <div className={styles.grid}>
                        <label>Status
                            <select value={status} onChange={e => setStatus(e.target.value)} style={SELECT_STYLE}>
                                <option value="scheduled">scheduled</option>
                                <option value="live">live</option>
                                <option value="finished">finished</option>
                            </select>
                        </label>
                        {showScore && <>
                            <label>{team1 || 'Tím 1'} – góly
                                <input type="number" min="0" max="30" value={score1}
                                    onChange={e => setScore1(e.target.value)} style={SELECT_STYLE} />
                            </label>
                            <label>{team2 || 'Tím 2'} – góly
                                <input type="number" min="0" max="30" value={score2}
                                    onChange={e => setScore2(e.target.value)} style={SELECT_STYLE} />
                            </label>
                        </>}
                    </div>
                </div>

                <div className={styles.section}>
                    <h4>Miesto</h4>
                    <input value={venue} onChange={e => setVenue(e.target.value)} style={INPUT_STYLE} />
                </div>

                <div className={styles.section}>
                    <h4>FlashScore link</h4>
                    <input
                        value={fsUrl}
                        onChange={e => setFsUrl(e.target.value)}
                        placeholder="https://www.flashscore.sk/zapas/hokej/..."
                        style={INPUT_STYLE}
                    />
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
