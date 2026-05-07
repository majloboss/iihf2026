import { useState } from 'react';
import { updateGame } from '../../api/admin';
import styles from './UserModal.module.css';

const TEAMS = [
    { code: 'FIN', name: 'Finland' },    { code: 'GER', name: 'Germany' },
    { code: 'USA', name: 'United States' }, { code: 'SUI', name: 'Switzerland' },
    { code: 'GBR', name: 'Great Britain' }, { code: 'AUT', name: 'Austria' },
    { code: 'HUN', name: 'Hungary' },    { code: 'LAT', name: 'Latvia' },
    { code: 'CAN', name: 'Canada' },     { code: 'SWE', name: 'Sweden' },
    { code: 'CZE', name: 'Czech Republic' }, { code: 'DEN', name: 'Denmark' },
    { code: 'SVK', name: 'Slovakia' },   { code: 'NOR', name: 'Norway' },
    { code: 'ITA', name: 'Italy' },      { code: 'SLO', name: 'Slovenia' },
];

function toLocalDateTimeInputs(iso) {
    if (!iso) return { date: '', time: '' };
    const d = new Date(iso);
    if (isNaN(d)) return { date: '', time: '' };
    const pad = n => String(n).padStart(2, '0');
    const date = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return { date, time };
}

export default function GameModal({ game, onClose, onSaved }) {
    const { date: initDate, time: initTime } = toLocalDateTimeInputs(game.starts_at);
    const [date,   setDate]   = useState(initDate);
    const [time,   setTime]   = useState(initTime);
    const [team1,  setTeam1]  = useState(game.team1 || '');
    const [team2,  setTeam2]  = useState(game.team2 || '');
    const [venue,  setVenue]  = useState(game.venue || '');
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState('');
    const [success, setSuccess] = useState('');

    const save = async () => {
        setSaving(true); setError(''); setSuccess('');
        try {
            const starts_at = date && time ? new Date(`${date}T${time}`).toISOString() : undefined;
            await updateGame(game.id, {
                starts_at,
                team1: team1 || null,
                team2: team2 || null,
                venue,
            });
            setSuccess('Uložené.');
            onSaved({ ...game, starts_at: starts_at ?? game.starts_at, team1: team1||null, team2: team2||null, venue });
        } catch (e) { setError(e.message); }
        finally { setSaving(false); }
    };

    return (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3>Zápas #{game.game_number}</h3>
                    <button className={styles.close} onClick={onClose}>✕</button>
                </div>

                <div className={styles.section}>
                    <h4>Dátum a čas</h4>
                    <div className={styles.grid}>
                        <label>Dátum
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                        </label>
                        <label>Čas
                            <input type="time" value={time} onChange={e => setTime(e.target.value)} />
                        </label>
                    </div>
                </div>

                <div className={styles.section}>
                    <h4>Tímy</h4>
                    <div className={styles.grid}>
                        <label>Tím 1
                            <select value={team1} onChange={e => setTeam1(e.target.value)} style={{padding:'8px 10px',border:'1px solid #ddd',borderRadius:'6px',fontSize:'0.9rem'}}>
                                <option value="">TBD</option>
                                {TEAMS.map(t => <option key={t.code} value={t.code}>{t.code} – {t.name}</option>)}
                            </select>
                        </label>
                        <label>Tím 2
                            <select value={team2} onChange={e => setTeam2(e.target.value)} style={{padding:'8px 10px',border:'1px solid #ddd',borderRadius:'6px',fontSize:'0.9rem'}}>
                                <option value="">TBD</option>
                                {TEAMS.map(t => <option key={t.code} value={t.code}>{t.code} – {t.name}</option>)}
                            </select>
                        </label>
                    </div>
                </div>

                <div className={styles.section}>
                    <h4>Miesto</h4>
                    <input value={venue} onChange={e => setVenue(e.target.value)}
                        style={{width:'100%',padding:'8px 10px',border:'1px solid #ddd',borderRadius:'6px',fontSize:'0.9rem',boxSizing:'border-box'}} />
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
