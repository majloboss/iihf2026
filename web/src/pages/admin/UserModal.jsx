import { useState } from 'react';
import { editUser, setUserPassword } from '../../api/admin';
import styles from './UserModal.module.css';

export default function UserModal({ user, onClose, onSaved }) {
    const [form, setForm] = useState({
        first_name: user.first_name || '',
        last_name:  user.last_name  || '',
        email:      user.email      || '',
        phone:      user.phone      || '',
    });
    const [newPass, setNewPass] = useState('');
    const [saving,  setSaving]  = useState(false);
    const [error,   setError]   = useState('');
    const [success, setSuccess] = useState('');

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const saveProfile = async () => {
        setSaving(true); setError(''); setSuccess('');
        try {
            await editUser(user.id, form);
            setSuccess('Profil uložený.');
            onSaved({ ...user, ...form });
        } catch (e) { setError(e.message); }
        finally { setSaving(false); }
    };

    const savePassword = async () => {
        if (newPass.length < 6) { setError('Heslo musí mať aspoň 6 znakov'); return; }
        setSaving(true); setError(''); setSuccess('');
        try {
            await setUserPassword(user.id, newPass);
            setNewPass('');
            setSuccess('Heslo zmenené.');
        } catch (e) { setError(e.message); }
        finally { setSaving(false); }
    };

    return (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        {user.avatar
                            ? <img className={styles.avatar} src={user.avatar} alt={user.username} />
                            : <div className={styles.avatarFallback}>{(user.username || '?')[0].toUpperCase()}</div>
                        }
                        <h3>Upraviť: {user.username}</h3>
                    </div>
                    <button className={styles.close} onClick={onClose}>✕</button>
                </div>

                <div className={styles.section}>
                    <h4>Profil</h4>
                    <div className={styles.grid}>
                        <label>Meno
                            <input value={form.first_name} onChange={e => set('first_name', e.target.value)} />
                        </label>
                        <label>Priezvisko
                            <input value={form.last_name} onChange={e => set('last_name', e.target.value)} />
                        </label>
                        <label>Email
                            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
                        </label>
                        <label>Telefón
                            <input value={form.phone} onChange={e => set('phone', e.target.value)} />
                        </label>
                    </div>
                    <button className={styles.btn} onClick={saveProfile} disabled={saving}>Uložiť profil</button>
                </div>

                <div className={styles.section}>
                    <h4>Zmeniť heslo</h4>
                    <div className={styles.row}>
                        <input
                            type="password"
                            placeholder="Nové heslo (min. 6 znakov)"
                            value={newPass}
                            onChange={e => setNewPass(e.target.value)}
                        />
                        <button className={styles.btn} onClick={savePassword} disabled={saving}>Nastaviť</button>
                    </div>
                </div>

                {error   && <p className={styles.error}>{error}</p>}
                {success && <p className={styles.success}>{success}</p>}
            </div>
        </div>
    );
}
