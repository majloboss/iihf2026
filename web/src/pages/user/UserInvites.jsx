import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import styles from './UserInvites.module.css';

function CopyBtn({ text }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button className={styles.btnCopy} onClick={copy}>
            {copied ? '✓ Skopírované' : 'Kopírovať link'}
        </button>
    );
}

export default function UserInvites() {
    const [invites,    setInvites]    = useState([]);
    const [groups,     setGroups]     = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [sending,    setSending]    = useState(false);
    const [sentTo,     setSentTo]     = useState('');
    const [groupId,    setGroupId]    = useState('');
    const [info,       setInfo]       = useState('');
    const [error,      setError]      = useState('');

    const load = () => {
        setLoading(true);
        apiFetch('v1/invites')
            .then(data => {
                setInvites(data.invites || []);
                setGroups(data.groups || []);
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const send = async () => {
        setSending(true); setInfo(''); setError('');
        try {
            const res = await apiFetch('v1/invites', {
                method: 'POST',
                body: JSON.stringify({
                    sent_to:  sentTo.trim() || null,
                    group_id: groupId ? parseInt(groupId) : null,
                }),
            });
            setSentTo(''); setGroupId('');
            if (res?.email_sent) setInfo('✓ Pozvánka odoslaná emailom na ' + res.sent_to);
            else if (res?.email_err) setError('Mail sa neodoslal: ' + res.email_err);
            else setInfo('✓ Pozvánka vytvorená — skopíruj link a pošli ho manuálne.');
            load();
        } catch (e) { setError(e.message); }
        finally { setSending(false); }
    };

    return (
        <div className={styles.wrap}>
            {/* Formulár */}
            <div className={styles.form}>
                <div className={styles.formRow}>
                    <label className={styles.label}>Adresát (email)</label>
                    <input
                        type="text"
                        placeholder="email alebo meno (voliteľné)"
                        value={sentTo}
                        onChange={e => setSentTo(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && send()}
                        className={styles.input}
                    />
                </div>
                {groups.length > 0 && (
                    <div className={styles.formRow}>
                        <label className={styles.label}>Skupina</label>
                        <select
                            value={groupId}
                            onChange={e => setGroupId(e.target.value)}
                            className={styles.input}
                        >
                            <option value="">— bez skupiny —</option>
                            {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                <button className={styles.btnSend} onClick={send} disabled={sending}>
                    {sending ? 'Odosielam…' : '+ Nová pozvánka'}
                </button>
            </div>

            {info  && <p className={styles.info}>{info}</p>}
            {error && <p className={styles.err}>{error}</p>}

            {/* Zoznam */}
            {loading ? <p className={styles.empty}>Načítavam…</p> : invites.length === 0 ? (
                <p className={styles.empty}>Zatiaľ si neodoslal žiadnu pozvánku.</p>
            ) : (
                <div className={styles.list}>
                    {invites.map(inv => (
                        <div key={inv.id} className={`${styles.card} ${inv.used_at ? styles.cardUsed : ''}`}>
                            <div className={styles.cardHead}>
                                <span className={styles.recipient}>
                                    {inv.sent_to || <span className={styles.noEmail}>bez emailu</span>}
                                </span>
                                <span className={inv.used_at ? styles.badgeUsed : styles.badgePending}>
                                    {inv.used_at ? '✓ Použitá' : 'Čaká'}
                                </span>
                            </div>
                            <div className={styles.cardMeta}>
                                {inv.group_name && (
                                    <span className={styles.groupBadge}>{inv.group_name}</span>
                                )}
                                <span className={styles.date}>
                                    {new Date(inv.created_at).toLocaleDateString('sk-SK', { day:'2-digit', month:'2-digit', year:'numeric' })}
                                </span>
                                {inv.used_by_username && (
                                    <span className={styles.usedBy}>→ {inv.used_by_username}</span>
                                )}
                                {inv.email_sent && (
                                    <span className={styles.mailSent} title="Email odoslaný">✉</span>
                                )}
                            </div>
                            {!inv.used_at && <CopyBtn text={inv.link} />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
