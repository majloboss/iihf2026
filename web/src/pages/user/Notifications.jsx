import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import styles from './Notifications.module.css';

export default function Notifications() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');

    useEffect(() => {
        apiFetch('v1/notifications')
            .then(data => { setItems(data); setLoading(false); })
            .catch(e => { setErr(e.message); setLoading(false); });
    }, []);

    const update = (type, field, value) => {
        setItems(prev => prev.map(it =>
            it.type === type ? { ...it, [field]: value } : it
        ));
    };

    const save = async () => {
        setSaving(true); setMsg(''); setErr('');
        try {
            await apiFetch('v1/notifications', { method: 'POST', body: JSON.stringify(items) });
            setMsg('Nastavenia uložené.');
        } catch (e) { setErr(e.message); }
        finally { setSaving(false); }
    };

    if (loading) return <p style={{ padding: 20 }}>Načítavam…</p>;

    return (
        <div className={styles.wrap}>
            <p className={styles.hint}>
                Zvoľ, o čom chceš byť upozornený. Email notifikácie vyžadujú overený email.
                Push notifikácie budú dostupné po spustení turnaja.
            </p>

            <div className={styles.list}>
                {items.map(it => (
                    <div key={it.type} className={`${styles.row} ${!it.enabled ? styles.rowOff : ''}`}>
                        <div className={styles.rowMain}>
                            <label className={styles.toggle}>
                                <input
                                    type="checkbox"
                                    checked={it.enabled}
                                    onChange={e => update(it.type, 'enabled', e.target.checked)}
                                />
                                <span className={styles.slider} />
                            </label>
                            <span className={styles.label}>{it.label}</span>
                        </div>

                        {it.enabled && (
                            <div className={styles.rowSub}>
                                <label className={styles.check}>
                                    <input
                                        type="checkbox"
                                        checked={it.email_enabled}
                                        onChange={e => update(it.type, 'email_enabled', e.target.checked)}
                                    />
                                    📧 Email
                                </label>
                                <label className={styles.check}>
                                    <input
                                        type="checkbox"
                                        checked={it.push_enabled}
                                        onChange={e => update(it.type, 'push_enabled', e.target.checked)}
                                    />
                                    🔔 Push
                                </label>
                                {it.timed && (
                                    <label className={styles.minutesLabel}>
                                        <span>Pred zápasom:</span>
                                        <select
                                            value={it.minutes_before}
                                            onChange={e => update(it.type, 'minutes_before', parseInt(e.target.value))}
                                            className={styles.select}
                                        >
                                            <option value={15}>15 min</option>
                                            <option value={30}>30 min</option>
                                            <option value={60}>1 hod</option>
                                            <option value={120}>2 hod</option>
                                            <option value={1440}>1 deň</option>
                                        </select>
                                    </label>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {err && <p className={styles.error}>{err}</p>}
            {msg && <p className={styles.success}>{msg}</p>}

            <button className={styles.btn} onClick={save} disabled={saving}>
                {saving ? 'Ukladám…' : 'Uložiť nastavenia'}
            </button>
        </div>
    );
}
