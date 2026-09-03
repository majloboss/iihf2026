import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompetition } from '../context/CompetitionContext';
import { getProfile, updateProfile, changePassword, deleteAccount, uploadAvatar } from '../api/profile';
import Groups from './user/Groups';
import Notifications from './user/Notifications';
import Statistiky from './user/Statistiky';
import styles from './Profile.module.css';

export default function Profile() {
    const { signOut, signIn } = useAuth();
    const navigate    = useNavigate();
    const fileRef     = useRef(null);
    const { competitions, activeCompetition, switchCompetition } = useCompetition();
    const [switchingId, setSwitchingId] = useState(null);

    const [searchParams, setSearchParams] = useSearchParams();
    const TABS = ['profil', 'statistiky', 'sutaze', 'skupiny', 'notif', 'odhlasenie'];
    const urlTab = searchParams.get('tab');
    const [tab, setTabState] = useState(TABS.includes(urlTab) ? urlTab : 'profil');

    // Zmena záložky sa premietne do URL, aby sa dala zdieľať aj obnoviť.
    const setTab = (next) => {
        setTabState(next);
        setSearchParams(next === 'profil' ? {} : { tab: next }, { replace: true });
    };

    const [form, setForm]     = useState({ first_name: '', last_name: '', email: '', phone: '' });
    const [avatar, setAvatar] = useState(null);
    const [pass, setPass]     = useState({ old_password: '', new_password: '', confirm: '' });
    const [delPass, setDelPass] = useState('');
    const [loading, setLoading] = useState(true);
    const [msg, setMsg]       = useState({ profile: '', pass: '', del: '', avatar: '' });
    const [err, setErr]       = useState({ profile: '', pass: '', del: '', avatar: '' });
    const [busy, setBusy]     = useState('');

    // Reaguj aj na zmenu URL zvonka (napr. opakovaný klik na logo súťaže).
    // Musí stáť až za všetkými useState — poradie hookov sa nesmie meniť.
    useEffect(() => {
        if (urlTab && TABS.includes(urlTab) && urlTab !== tab) setTabState(urlTab);
    }, [urlTab]);

    useEffect(() => {
        getProfile().then(d => {
            setForm({ first_name: d.first_name || '', last_name: d.last_name || '', email: d.email || '', phone: d.phone || '' });
            setAvatar(d.avatar || null);
            setLoading(false);
        });
    }, []);

    const setF   = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const setPas = (k, v) => setPass(p => ({ ...p, [k]: v }));

    const onAvatarPick = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setBusy('avatar'); setErr(er => ({ ...er, avatar: '' })); setMsg(m => ({ ...m, avatar: '' }));
        try {
            const data = await uploadAvatar(file);
            setAvatar(data.avatar);
            setMsg(m => ({ ...m, avatar: 'Fotka uložená.' }));
        } catch (ex) { setErr(er => ({ ...er, avatar: ex.message })); }
        finally { setBusy(''); e.target.value = ''; }
    };

    const saveProfile = async () => {
        setBusy('profile'); setErr(e => ({ ...e, profile: '' })); setMsg(m => ({ ...m, profile: '' }));
        try {
            await updateProfile(form);
            setMsg(m => ({ ...m, profile: 'Profil uložený.' }));
        } catch (e) { setErr(er => ({ ...er, profile: e.message })); }
        finally { setBusy(''); }
    };

    const savePassword = async () => {
        if (pass.new_password !== pass.confirm) {
            setErr(e => ({ ...e, pass: 'Heslá sa nezhodujú' })); return;
        }
        setBusy('pass'); setErr(e => ({ ...e, pass: '' })); setMsg(m => ({ ...m, pass: '' }));
        try {
            const res = await changePassword({ old_password: pass.old_password, new_password: pass.new_password });
            if (res?.token) signIn(res.token); // uložíme nový token s aktualizovanou token_version
            setPass({ old_password: '', new_password: '', confirm: '' });
            setMsg(m => ({ ...m, pass: 'Heslo zmenené.' }));
        } catch (e) { setErr(er => ({ ...er, pass: e.message })); }
        finally { setBusy(''); }
    };

    const doDelete = async () => {
        if (!confirm('Naozaj chceš zmazať svoj účet? Táto akcia je nevratná.')) return;
        setBusy('del'); setErr(e => ({ ...e, del: '' }));
        try {
            await deleteAccount({ password: delPass });
            signOut();
            navigate('/login');
        } catch (e) { setErr(er => ({ ...er, del: e.message })); }
        finally { setBusy(''); }
    };

    const handleSwitch = async (id) => {
        setSwitchingId(id);
        try { await switchCompetition(id); } catch {}
        setSwitchingId(null);
    };

    if (loading) return <div className={styles.wrap}><p>Načítavam…</p></div>;

    const TOURNAMENT_LOGO = (slug) => `/logos/tournament_logo_${slug}.png`;

    return (
        <div className={styles.wrap}>
            <div className={styles.card}>
                <div className={styles.tabsRow}>
                    <div className={styles.tabs}>
                        <button className={tab === 'profil'     ? styles.tabActive : styles.tab} onClick={() => setTab('profil')}>Profil</button>
                        <button className={tab === 'statistiky' ? styles.tabActive : styles.tab} onClick={() => setTab('statistiky')}>Štatistiky</button>
                        <button className={tab === 'sutaze'     ? styles.tabActive : styles.tab} onClick={() => setTab('sutaze')}>Súťaže</button>
                        <button className={tab === 'skupiny'    ? styles.tabActive : styles.tab} onClick={() => setTab('skupiny')}>Skupiny</button>
                        <button className={tab === 'notif'      ? styles.tabActive : styles.tab} onClick={() => setTab('notif')}>Notif</button>
                        <button className={tab === 'odhlasenie' ? styles.tabActive : styles.tab} onClick={() => setTab('odhlasenie')}>Odhlásenie</button>
                    </div>
                </div>

                {tab === 'sutaze' && (
                    <div className={styles.tabContent}>
                        <section className={styles.section}>
                            <h3>Aktívna súťaž</h3>
                            <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>
                                Všetky stránky (Zápasy, Tabuľky, Poradie) zobrazujú dáta pre vybranú súťaž.
                            </p>
                        </section>
                        <section className={styles.section}>
                            {competitions.map(c => {
                                const isActive = activeCompetition?.id === c.id;
                                return (
                                    <div key={c.id} className={styles.competitionCard} style={{
                                        border: `2px solid ${isActive ? '#1a3a6b' : '#e0e0e0'}`,
                                        borderRadius: 10,
                                        padding: '16px 20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        background: isActive ? '#f0f4fb' : '#fafafa',
                                        gap: 12,
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                            <img
                                                src={TOURNAMENT_LOGO(c.slug)}
                                                alt={c.name}
                                                style={{ height: 64, width: 'auto', objectFit: 'contain', flexShrink: 0 }}
                                                onError={e => e.target.style.display = 'none'}
                                            />
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#1a3a6b', fontSize: '0.95rem' }}>{c.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#888' }}>{c.starts_at} – {c.ends_at}</div>
                                            </div>
                                        </div>
                                        {isActive
                                            ? <span style={{ color: '#27ae60', fontWeight: 700, fontSize: '0.85rem' }}>✓ Aktívna</span>
                                            : <button
                                                className={styles.btn}
                                                style={{ padding: '7px 16px', fontSize: '0.82rem' }}
                                                disabled={switchingId === c.id}
                                                onClick={() => handleSwitch(c.id)}
                                              >
                                                {switchingId === c.id ? 'Prepínam…' : 'Prepnúť'}
                                              </button>
                                        }
                                    </div>
                                );
                            })}
                        </section>
                    </div>
                )}
                {tab === 'skupiny'    && <div className={styles.tabContent}><Groups /></div>}
                {tab === 'statistiky' && <div className={styles.tabContent}><Statistiky /></div>}
                {tab === 'notif'     && <div className={styles.tabContent}><Notifications /></div>}
                {tab === 'odhlasenie' && (
                    <div className={styles.tabContent}>
                        <section className={styles.section}>
                            <h3>Odhlásenie</h3>
                            <p style={{ color: '#666', marginBottom: '20px' }}>Chceš sa odhlásiť z aplikácie?</p>
                            <button className={styles.btnDanger} onClick={() => { signOut(); navigate('/login'); }}>
                                🚪 Odhlásiť sa
                            </button>
                        </section>
                    </div>
                )}

                {tab === 'profil' && <>
                    <section className={styles.section}>
                        <h3>Profilová fotka</h3>
                        <div className={styles.avatarRow}>
                            <div className={styles.avatarPreview}>
                                {avatar
                                    ? <img src={avatar} alt="avatar" />
                                    : <span className={styles.avatarPlaceholder}>👤</span>
                                }
                            </div>
                            <div>
                                <button
                                    className={styles.btn}
                                    onClick={() => fileRef.current?.click()}
                                    disabled={busy === 'avatar'}
                                >
                                    {busy === 'avatar' ? 'Nahrávam…' : 'Zmeniť fotku'}
                                </button>
                                <p className={styles.avatarHint}>JPG, PNG, WEBP alebo GIF · max 2 MB</p>
                            </div>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                style={{ display: 'none' }}
                                onChange={onAvatarPick}
                            />
                        </div>
                        {err.avatar && <p className={styles.error}>{err.avatar}</p>}
                        {msg.avatar && <p className={styles.success}>{msg.avatar}</p>}
                    </section>

                    <section className={styles.section}>
                        <h3>Osobné údaje</h3>
                        <div className={styles.grid}>
                            <label>Meno
                                <input value={form.first_name} onChange={e => setF('first_name', e.target.value)} />
                            </label>
                            <label>Priezvisko
                                <input value={form.last_name} onChange={e => setF('last_name', e.target.value)} />
                            </label>
                            <label>Email
                                <input type="email" value={form.email} onChange={e => setF('email', e.target.value)} />
                            </label>
                            <label>Telefón
                                <input value={form.phone} onChange={e => setF('phone', e.target.value)} />
                            </label>
                        </div>
                        {err.profile && <p className={styles.error}>{err.profile}</p>}
                        {msg.profile && <p className={styles.success}>{msg.profile}</p>}
                        <button className={styles.btn} onClick={saveProfile} disabled={busy === 'profile'}>
                            {busy === 'profile' ? 'Ukladám…' : 'Uložiť'}
                        </button>
                    </section>

                    <section className={styles.section}>
                        <h3>Zmeniť heslo</h3>
                        <label>Aktuálne heslo
                            <input type="password" value={pass.old_password} onChange={e => setPas('old_password', e.target.value)} />
                        </label>
                        <label>Nové heslo
                            <input type="password" value={pass.new_password} onChange={e => setPas('new_password', e.target.value)} />
                        </label>
                        <label>Potvrdiť nové heslo
                            <input type="password" value={pass.confirm} onChange={e => setPas('confirm', e.target.value)} />
                        </label>
                        {err.pass && <p className={styles.error}>{err.pass}</p>}
                        {msg.pass && <p className={styles.success}>{msg.pass}</p>}
                        <button className={styles.btn} onClick={savePassword} disabled={busy === 'pass'}>
                            {busy === 'pass' ? 'Mením…' : 'Zmeniť heslo'}
                        </button>
                    </section>

                    <section className={styles.sectionDanger}>
                        <h3>Zmazať účet</h3>
                        <p>Pre potvrdenie zadaj svoje heslo:</p>
                        <div className={styles.row}>
                            <input type="password" value={delPass} onChange={e => setDelPass(e.target.value)} placeholder="Heslo" />
                            <button className={styles.btnDanger} onClick={doDelete} disabled={busy === 'del'}>
                                Zmazať účet
                            </button>
                        </div>
                        {err.del && <p className={styles.error}>{err.del}</p>}
                    </section>
                </>}
            </div>
        </div>
    );
}
