import { useEffect, useState } from 'react';
import { getInvites, createInvite, updateInviteSentTo } from '../../api/admin';
import UserModal from './UserModal';
import styles from './Admin.module.css';

function CopyBtn({ text }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button onClick={copy} className={styles.btnSmall}>
            {copied ? '✓ Skopírované' : 'Kopírovať'}
        </button>
    );
}

function SentToCell({ invite, onSaved }) {
    const [editing, setEditing] = useState(false);
    const [val, setVal]         = useState(invite.sent_to || '');
    const [saving, setSaving]   = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            await updateInviteSentTo(invite.id, val);
            onSaved(invite.id, val);
            setEditing(false);
        } catch (e) { alert(e.message); }
        finally { setSaving(false); }
    };

    const cancel = () => { setVal(invite.sent_to || ''); setEditing(false); };

    if (editing) {
        return (
            <span style={{display:'inline-flex', gap:4, alignItems:'center'}}>
                <input autoFocus value={val} onChange={e => setVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
                    className={styles.inlineInput} style={{width:120}} />
                <button onClick={save} disabled={saving} className={styles.btnSmall}>✓</button>
                <button onClick={cancel} className={styles.btnSmall}>✕</button>
            </span>
        );
    }

    return (
        <span onClick={() => setEditing(true)}
            title="Klikni pre editáciu"
            style={{cursor:'pointer', minWidth:80, display:'inline-block'}}>
            {invite.sent_to || <span style={{color:'#aaa'}}>—</span>}
        </span>
    );
}

export default function Invites() {
    const [invites,    setInvites]    = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [generating, setGen]        = useState(false);
    const [sentTo,     setSentTo]     = useState('');
    const [error,      setError]      = useState('');
    const [info,       setInfo]       = useState('');
    const [editUser,   setEditUser]   = useState(null);

    const load = () => getInvites()
        .then(setInvites)
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));

    useEffect(() => { load(); }, []);

    const generate = async () => {
        setGen(true); setError(''); setInfo('');
        try {
            const res = await createInvite(sentTo.trim() || null);
            setSentTo('');
            if (res?.email_sent) setInfo('✓ Pozvánka odoslaná emailom');
            else if (res?.email_err) setError('Mail chyba: ' + res.email_err);
            load();
        } catch (err) { setError(err.message); }
        finally { setGen(false); }
    };

    const handleSentToSaved = (id, val) => {
        setInvites(prev => prev.map(i => i.id === id ? { ...i, sent_to: val || null } : i));
    };

    return (
        <div>
            <div className={styles.header}>
                <h2>Pozvánky</h2>
            </div>

            <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:16, flexWrap:'wrap'}}>
                <label style={{fontWeight:500, fontSize:'0.9rem'}}>Adresát</label>
                <input
                    type="text"
                    placeholder="meno / email"
                    value={sentTo}
                    onChange={e => setSentTo(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && generate()}
                    className={styles.inlineInput}
                    style={{width:200}}
                />
                <button className={styles.btn} onClick={generate} disabled={generating}>
                    {generating ? 'Generujem…' : '+ Nový link'}
                </button>
            </div>

            {error && <p className={styles.error}>{error}</p>}
            {info  && <p className={styles.success}>{info}</p>}

            {loading ? <p>Načítavam…</p> : (
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Adresát</th>
                            <th>Vytvorený</th>
                            <th>Použitý</th>
                            <th>Hráč</th>
                            <th>Mail</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {invites.map(i => (
                            <tr key={i.id}>
                                <td>{i.id}</td>
                                <td><SentToCell invite={i} onSaved={handleSentToSaved} /></td>
                                <td>{new Date(i.created_at).toLocaleString('sk-SK')}</td>
                                <td>{i.used_at
                                    ? new Date(i.used_at).toLocaleString('sk-SK')
                                    : <span className={styles.unused}>Nepoužitý</span>}
                                </td>
                                <td>
                                    {i.used_by_username
                                        ? <span
                                            onClick={() => setEditUser({ id: i.used_by_id, username: i.used_by_username, first_name: i.first_name, last_name: i.last_name, email: i.email, phone: i.phone, avatar: i.avatar })}
                                            style={{ cursor: 'pointer', color: '#0d6efd', textDecoration: 'underline' }}
                                          >{i.used_by_username}</span>
                                        : '—'}
                                </td>
                                <td>
                                    {i.email_sent
                                        ? <span className={styles.badgeProd} title="Pozvánka odoslaná emailom">✓</span>
                                        : <span style={{color:'#aaa'}}>—</span>}
                                </td>
                                <td><CopyBtn text={i.link} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {editUser && (
                <UserModal
                    user={editUser}
                    onClose={() => setEditUser(null)}
                    onSaved={() => setEditUser(null)}
                />
            )}
        </div>
    );
}
