import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile, changePassword, deleteAccount } from '../api/profile';
import styles from './Profile.module.css';

export default function Profile() {
    const { signOut } = useAuth();
    const navigate    = useNavigate();

    const [form, setForm]   = useState({ first_name: '', last_name: '', email: '', phone: '' });
    const [pass, setPass]   = useState({ old_password: '', new_password: '', confirm: '' });
    const [delPass, setDelPass] = useState('');
    const [loading, setLoading] = useState(true);
    const [msg, setMsg]     = useState({ profile: '', pass: '', del: '' });
    const [err, setErr]     = useState({ profile: '', pass: '', del: '' });
    const [busy, setBusy]   = useState('');

    useEffect(() => {
        getProfile().then(d => {
            setForm({ first_name: d.first_name || '', last_name: d.last_name || '', email: d.email || '', phone: d.phone || '' });
            setLoading(false);
        });
    }, []);

    const setF  = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const setPas = (k, v) => setPass(p => ({ ...p, [k]: v }));

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
                <h2>Môj profil</h2>

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
            </div>
        </div>
    );
}
