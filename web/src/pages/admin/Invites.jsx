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
    const [groups,     setGroups]     = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [generating, setGen]        = useState(false);
    const [sentTo,     setSentTo]     = useState('');
    const [groupId,    setGroupId]    = useState('');
    const [error,      setError]      = useState('');
    const [info,       setInfo]       = useState('');
    const [editUser,   setEditUser]   = useState(null);

    const load = () => getInvites()
        .then(data => {
            // API vracia {invites, groups}
            if (data?.invites) {
                setInvites(data.invites);
                setGroups(data.groups || []);
            } else {
                setInvites(data); // fallback pre staré API
            }
        })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));

    useEffect(() => { load(); }, []);

    const generate = async () => {
        setGen(true); setError(''); setInfo('');
        try {
            const res = await createInvite(sentTo.trim() || null, groupId ? parseInt(groupId) : null);
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

            <div className={styles.genForm} style={{marginBottom:16}}>
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
                {groups.length > 0 && (
                    <>
                        <label style={{fontWeight:500, fontSize:'0.9rem'}}>Skupina</label>
                        <select
                            value={groupId}
                            onChange={e => setGroupId(e.target.value)}
                            className={styles.inlineInput}
                            style={{width:160}}
                        >
                            <option value="">— bez skupiny —</option>
                            {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </>
                )}
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
                            <th className={styles.hideOnMobile}>ID</th>
                            <th>Vytvorený</th>
                            <th>Zaslal</th>
                            <th>Adresát</th>
                            <th>Skupina</th>
                            <th>Použitý</th>
                            <th>Hráč</th>
                            <th>Mail</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {invites.map(i => (
                            <tr key={i.id}>
                                <td data-label="ID" className={styles.hideOnMobile}>{i.id}</td>
                                <td data-label="Vytvorený">{new Date(i.created_at).toLocaleString('sk-SK')}</td>
                                <td data-label="Zaslal">{i.created_by_username || <span style={{color:'#aaa'}}>—</span>}</td>
                                <td data-label="Adresát"><SentToCell invite={i} onSaved={handleSentToSaved} /></td>
                                <td data-label="Skupina">
                                    {i.group_name
                                        ? <span className={styles.badgeInfo}>{i.group_name}</span>
                                        : <span style={{color:'#aaa'}}>—</span>}
                                </td>
                                <td data-label="Použitý">{i.used_at
                                    ? new Date(i.used_at).toLocaleString('sk-SK')
                                    : <span className={styles.unused}>Nepoužitý</span>}
                                </td>
                                <td data-label="Hráč">
                                    {i.used_by_username
                                        ? <span
                                            onClick={() => setEditUser({ id: i.used_by_id, username: i.used_by_username, first_name: i.first_name, last_name: i.last_name, email: i.email, phone: i.phone, avatar: i.avatar })}
                                            style={{ cursor: 'pointer', color: '#0d6efd', textDecoration: 'underline' }}
                                          >{i.used_by_username}</span>
                                        : '—'}
                                </td>
                                <td data-label="Mail">
                                    {i.email_sent
                                        ? <span className={styles.badgeProd} title="Pozvánka odoslaná emailom">✓</span>
                                        : <span style={{color:'#aaa'}}>—</span>}
                                </td>
                                <td data-label=""><CopyBtn text={i.link} /></td>
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
