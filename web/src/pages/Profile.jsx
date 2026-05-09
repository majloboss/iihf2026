import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile, changePassword, deleteAccount, uploadAvatar } from '../api/profile';
import Groups from './user/Groups';
import Notifications from './user/Notifications';
import styles from './Profile.module.css';

export default function Profile() {
    const { signOut } = useAuth();
    const navigate    = useNavigate();
    const fileRef     = useRef(null);

    const [tab, setTab]       = useState('profil');
    const [form, setForm]     = useState({ first_name: '', last_name: '', email: '', phone: '' });
    const [avatar, setAvatar] = useState(null);
    const [pass, setPass]     = useState({ old_password: '', new_password: '', confirm: '' });
    const [delPass, setDelPass] = useState('');
    const [loading, setLoading] = useState(true);
    const [msg, setMsg]       = useState({ profile: '', pass: '', del: '', avatar: '' });
    const [err, setErr]       = useState({ profile: '', pass: '', del: '', avatar: '' });
    const [busy, setBusy]     = useState('');

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
            await changePassword({ old_password: pass.old_password, new_password: pass.new_password });
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

    if (loading) return <div className={styles.wrap}><p>Načítavam…</p></div>;

    return (
        <div className={styles.wrap}>
            <div className={styles.card}>
                <div className={styles.tabsRow}>
                    <div className={styles.tabs}>
                        <button className={tab === 'profil'  ? styles.tabActive : styles.tab} onClick={() => setTab('profil')}>👤 Profil</button>
                        <button className={tab === 'skupiny' ? styles.tabActive : styles.tab} onClick={() => setTab('skupiny')}>👥 Skupiny</button>
                        <button className={tab === 'notif'   ? styles.tabActive : styles.tab} onClick={() => setTab('notif')}>🔔 Notifikácie</button>
                    </div>
                    <button className={styles.btnLogout} onClick={() => { signOut(); navigate('/login'); }}>Odhlásiť</button>
                </div>

                {tab === 'skupiny' && <div className={styles.tabContent}><Groups /></div>}
                {tab === 'notif'   && <div className={styles.tabContent}><Notifications /></div>}

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
