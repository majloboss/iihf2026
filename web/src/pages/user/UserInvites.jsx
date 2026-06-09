import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useCompetition } from '../../context/CompetitionContext';
import styles from './UserInvites.module.css';

function buildInviteText(inv, myUsername) {
    const rulesUrl = window.location.origin + '/pravidla';
    const groupLine = inv.group_name
        ? `Po registrácii budeš automaticky pridaný do skupiny "${inv.group_name}", kde budeš môcť súťažiť s ${myUsername} a ostatnými členmi.\n\n`
        : 'Odporúčame Ti pripojiť sa k existujúcej skupine alebo si vytvoriť vlastnú a pozvať ďalších priateľov.\n\n';
    return `Pozývam Ťa do BetClub - tipovačky výsledkov športových zápasov pre Teba a Tvojich kamošov.

Zaregistruj sa kliknutím na tento odkaz:
${inv.link}

Po registrácii si zvolíš vlastné meno a heslo. Potom môžeš:
- tipovať presné výsledky zápasov
- súťažiť s kamarátmi v skupinách
- sledovať priebežné poradie

${groupLine}Pred začatím si prečítaj pravidlá tipovačky:
${rulesUrl}

Link je jednorazový – platí pre jednu registráciu.

Tešíme sa na Teba!
BetClub – Tipujte s kamošmi`;
}

function CopyBtn({ text }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button className={styles.btnCopy} onClick={copy}>
            {copied ? '✓ Skopírované' : 'Kopírovať pozvánku'}
        </button>
    );
}

export default function UserInvites() {
    const { activeCompetition } = useCompetition();
    const compId = activeCompetition?.id ?? null;

    const [invites,    setInvites]    = useState([]);
    const [groups,     setGroups]     = useState([]);
    const [myUsername, setMyUsername] = useState('');
    const [loading,    setLoading]    = useState(true);
    const [sending,    setSending]    = useState(false);
    const [revoking,   setRevoking]   = useState(null);
    const [sentTo,     setSentTo]     = useState('');
    const [groupId,    setGroupId]    = useState('');
    const [info,       setInfo]       = useState('');
    const [error,      setError]      = useState('');

    const load = () => {
        setLoading(true);
        apiFetch(`v1/invites${compId ? `?competition_id=${compId}` : ''}`)
            .then(data => {
                setInvites(data.invites || []);
                setGroups(data.groups || []);
                setMyUsername(data.my_username || '');
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [compId]);

    const revoke = async (id) => {
        if (!confirm('Zrušiť pozvánku? Link bude zneplatnený.')) return;
        setRevoking(id);
        try {
            await apiFetch('v1/invites', { method: 'DELETE', body: JSON.stringify({ id }) });
            load();
        } catch (e) { setError(e.message); }
        finally { setRevoking(null); }
    };

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
                                <option key={g.id} value={g.id}>
                                    {g.name}{g.competition_name ? ` (${g.competition_name})` : ''}
                                </option>
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
                    {invites.map(inv => {
                        const isUsed      = !!inv.used_at;
                        const isCancelled = !!inv.cancelled_at;
                        const isPending   = !isUsed && !isCancelled;
                        return (
                        <div key={inv.id} className={`${styles.card} ${isUsed ? styles.cardUsed : ''} ${isCancelled ? styles.cardCancelled : ''}`}>
                            <div className={styles.cardHead}>
                                <span className={styles.recipient}>
                                    {inv.sent_to || <span className={styles.noEmail}>bez emailu</span>}
                                </span>
                                <span className={isUsed ? styles.badgeUsed : isCancelled ? styles.badgeCancelled : styles.badgePending}>
                                    {isUsed ? '✓ Použitá' : isCancelled ? '✕ Zrušená' : 'Čaká'}
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
                            {isPending && (
                                <div style={{display:'flex', gap:8, marginTop:8}}>
                                    <CopyBtn text={buildInviteText(inv, myUsername)} />
                                    <button
                                        onClick={() => revoke(inv.id)}
                                        disabled={revoking === inv.id}
                                        className={styles.btnRevoke}
                                    >
                                        {revoking === inv.id ? '…' : 'Zrušiť pozvánku'}
                                    </button>
                                </div>
                            )}
                        </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
