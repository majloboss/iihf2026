import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import styles from './Notifications.module.css';

const BASE = import.meta.env.VITE_API_URL ?? '/api';

function urlBase64ToUint8Array(b64) {
    const pad = '='.repeat((4 - b64.length % 4) % 4);
    const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export default function Notifications() {
    const [items,    setItems]    = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [saving,   setSaving]   = useState(false);
    const [msg,      setMsg]      = useState('');
    const [err,      setErr]      = useState('');

    const [pushSupported,  setPushSupported]  = useState(false);
    const [pushAvailable,  setPushAvailable]  = useState(false);
    const [isSubscribed,   setIsSubscribed]   = useState(false);
    const [subLoading,     setSubLoading]     = useState(false);
    const [subMsg,         setSubMsg]         = useState('');
    const [testLoading,    setTestLoading]    = useState(false);
    const [testMsg,        setTestMsg]        = useState(null);

    useEffect(() => {
        apiFetch('v1/notifications')
            .then(data => { setItems(data); setLoading(false); })
            .catch(e => { setErr(e.message); setLoading(false); });
        checkPushStatus();
    }, []);

    const checkPushStatus = async () => {
        if (!('PushManager' in window) || !('serviceWorker' in navigator)) return;
        setPushSupported(true);
        try {
            const res = await fetch(BASE + '/v1/push-config');
            const data = await res.json();
            if (!data.ok) return;
            setPushAvailable(true);
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            setIsSubscribed(!!sub);
        } catch {}
    };

    const subscribe = async () => {
        setSubLoading(true); setSubMsg('');
        try {
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') throw new Error('Notifikácie zamietnuté — povoľ ich v nastaveniach prehliadača.');
            const res  = await fetch(BASE + '/v1/push-config');
            const data = await res.json();
            const reg  = await navigator.serviceWorker.ready;
            const sub  = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(data.data.public_key),
            });
            await apiFetch('v1/push-subscribe', { method: 'POST', body: JSON.stringify({ subscription: sub.toJSON() }) });
            setIsSubscribed(true);
            setSubMsg('✓ Push notifikácie aktivované pre tento browser.');
        } catch (e) { setSubMsg('✗ ' + e.message); }
        finally { setSubLoading(false); }
    };

    const unsubscribe = async () => {
        setSubLoading(true); setSubMsg('');
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            const endpoint = sub?.endpoint ?? null;
            if (sub) await sub.unsubscribe();
            await apiFetch('v1/push-subscribe', { method: 'DELETE', body: JSON.stringify({ endpoint }) });
            setIsSubscribed(false);
            setSubMsg('Push notifikácie odhlásené pre tento browser.');
        } catch (e) { setSubMsg('✗ ' + e.message); }
        finally { setSubLoading(false); }
    };

    const update = (type, field, value) =>
        setItems(prev => prev.map(it => it.type === type ? { ...it, [field]: value } : it));

    const save = async () => {
        setSaving(true); setMsg(''); setErr('');
        try {
            await apiFetch('v1/notifications', { method: 'POST', body: JSON.stringify(items) });
            setMsg('Nastavenia uložené.');
        } catch (e) { setErr(e.message); }
        finally { setSaving(false); }
    };

    if (loading) return <p style={{ padding: 20 }}>Načítavam…</p>;

    const poslatTest = async () => {
        setTestLoading(true); setTestMsg(null);
        try {
            const r = await apiFetch('v1/notification-test', { method: 'POST' });
            const spravy = [];
            spravy.push(r.email?.sent
                ? { ok: true,  text: `E-mail odoslaný na ${r.email.to}` }
                : { ok: false, text: r.email?.error || 'E-mail sa neodoslal' });
            spravy.push(r.push?.sent
                ? { ok: true,  text: `Push odoslaný na ${r.push.count} ${r.push.count === 1 ? 'zariadenie' : 'zariadenia'}` }
                : { ok: false, text: r.push?.error || 'Push sa neodoslal' });
            // Bez zapnutého typu notifikácie by ostré upozornenie neprišlo,
            // hoci skúšobná správa dorazí — na to treba upozorniť.
            if (r.settings && Object.keys(r.settings).length === 0) {
                spravy.push({ ok: false, text: 'Nemáš zapnutý žiadny typ upozornenia — ostré notifikácie ti chodiť nebudú.' });
            }
            setTestMsg(spravy);
        } catch (e) {
            setTestMsg([{ ok: false, text: e.message }]);
        } finally { setTestLoading(false); }
    };

    return (
        <div className={styles.wrap}>

            {/* ── Push subscription status ─────────────────────────── */}
            {pushSupported && pushAvailable && (
                <div className={styles.pushStatus}>
                    {isSubscribed ? (
                        <div className={styles.pushActive}>
                            <span>🔔 Push notifikácie aktívne v tomto prehliadači</span>
                            <button className={styles.btnSmall} onClick={unsubscribe} disabled={subLoading}>
                                {subLoading ? '…' : 'Odhlásiť'}
                            </button>
                        </div>
                    ) : (
                        <div className={styles.pushInactive}>
                            <span>🔕 Push notifikácie nie sú aktívne</span>
                            <button className={styles.btnSmall} onClick={subscribe} disabled={subLoading}>
                                {subLoading ? 'Prihlasujem…' : 'Aktivovať push'}
                            </button>
                        </div>
                    )}
                    {subMsg && (
                        <p className={subMsg.startsWith('✓') ? styles.success : styles.error}
                           style={{ margin: '6px 0 0' }}>
                            {subMsg}
                        </p>
                    )}
                </div>
            )}

            {/* Skúšobná správa ide rovnakou cestou ako ostré notifikácie, takže
                overí celý reťazec — nie iba to, že sa niečo odoslalo. */}
            <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #e9ecef' }}>
                <h3 style={{ margin: '0 0 6px', fontSize: '0.95rem' }}>Vyskúšať doručenie</h3>
                <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: '#666' }}>
                    Pošleme ti skúšobnú správu e-mailom aj ako push, nech vidíš,
                    či ti upozornenia chodia. Nemusíš čakať na najbližší zápas.
                </p>
                <button className={styles.btn} onClick={poslatTest} disabled={testLoading}>
                    {testLoading ? 'Posielam…' : 'Poslať skúšobnú správu'}
                </button>

                {testMsg && (
                    <div style={{ marginTop: 10, fontSize: '0.85rem' }}>
                        {testMsg.map((r, i) => (
                            <div key={i} style={{ color: r.ok ? '#1a7f37' : '#c0392b' }}>
                                {r.ok ? '✓' : '✗'} {r.text}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <p className={styles.hint}>
                Zvoľ, o čom chceš byť upozornený. Email notifikácie vyžadujú overený email.
            </p>

            <div className={styles.list}>
                {items.map(it => (
                    <div key={it.type} className={`${styles.row} ${!it.enabled ? styles.rowOff : ''}`}>
                        <div className={styles.rowMain}>
                            <label className={styles.toggle}>
                                <input type="checkbox" checked={it.enabled}
                                    onChange={e => update(it.type, 'enabled', e.target.checked)} />
                                <span className={styles.slider} />
                            </label>
                            <span className={styles.label}>{it.label}</span>
                        </div>

                        {it.enabled && (
                            <div className={styles.rowSub}>
                                <label className={styles.check}>
                                    <input type="checkbox" checked={it.email_enabled}
                                        onChange={e => update(it.type, 'email_enabled', e.target.checked)} />
                                    📧 Email
                                </label>
                                {pushAvailable && (
                                    <label className={`${styles.check} ${!isSubscribed ? styles.checkDisabled : ''}`}
                                           title={!isSubscribed ? 'Najprv aktivuj push notifikácie' : ''}>
                                        <input type="checkbox" checked={it.push_enabled}
                                            disabled={!isSubscribed}
                                            onChange={e => update(it.type, 'push_enabled', e.target.checked)} />
                                        🔔 Push
                                    </label>
                                )}
                                {it.timed && (
                                    <label className={styles.minutesLabel}>
                                        <span>Pred zápasom:</span>
                                        <select value={it.minutes_before}
                                            onChange={e => update(it.type, 'minutes_before', parseInt(e.target.value))}
                                            className={styles.select}>
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
