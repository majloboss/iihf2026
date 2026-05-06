import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getGroups, createGroup, disbandGroup, joinGroup, leaveGroup, getMembers, memberAction } from '../../api/groups';
import styles from './Groups.module.css';

export default function Groups() {
    const { user } = useAuth();
    const [groups, setGroups]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [createErr, setCreateErr] = useState('');
    const [busy, setBusy]       = useState('');
    const [expanded, setExpanded] = useState(null);
    const [members, setMembers] = useState({});

    const load = () => getGroups().then(setGroups).finally(() => setLoading(false));
    useEffect(() => { load(); }, []);

    const loadMembers = (group_id) =>
        getMembers(group_id).then(data => setMembers(m => ({ ...m, [group_id]: data })));

    const toggleExpand = (id) => {
        if (expanded === id) { setExpanded(null); return; }
        setExpanded(id);
        loadMembers(id);
    };

    const doCreate = async () => {
        if (!newName.trim()) return;
        setBusy('create'); setCreateErr('');
        try {
            await createGroup(newName.trim());
            setNewName(''); setCreating(false);
            load();
        } catch (e) { setCreateErr(e.message); }
        finally { setBusy(''); }
    };

    const doJoin = async (group_id) => {
        setBusy(`join-${group_id}`);
        try { await joinGroup(group_id); load(); }
        catch (e) { alert(e.message); }
        finally { setBusy(''); }
    };

    const doLeave = async (group_id) => {
        if (!confirm('Naozaj chceš opustiť skupinu?')) return;
        setBusy(`leave-${group_id}`);
        try { await leaveGroup(group_id); load(); }
        catch (e) { alert(e.message); }
        finally { setBusy(''); }
    };

    const doDisband = async (group_id) => {
        if (!confirm('Naozaj chceš zrušiť skupinu? Táto akcia je nevratná.')) return;
        setBusy(`disband-${group_id}`);
        try { await disbandGroup(group_id); load(); }
        catch (e) { alert(e.message); }
        finally { setBusy(''); }
    };

    const doMemberAction = async (group_id, uid, action) => {
        setBusy(`member-${uid}`);
        try {
            await memberAction(group_id, uid, action);
            await loadMembers(group_id);
            load();
        } catch (e) { alert(e.message); }
        finally { setBusy(''); }
    };

    if (loading) return <div className={styles.wrap}><p>Načítavam…</p></div>;

    return (
        <div className={styles.wrap}>
            <div className={styles.topBar}>
                <h2>Skupiny priateľov</h2>
                <button className={styles.btnNew} onClick={() => { setCreating(c => !c); setCreateErr(''); setNewName(''); }}>
                    {creating ? 'Zrušiť' : '+ Nová skupina'}
                </button>
            </div>

            {creating && (
                <div className={styles.createForm}>
                    <input
                        autoFocus
                        placeholder="Názov skupiny"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && doCreate()}
                    />
                    <button className={styles.btn} onClick={doCreate} disabled={busy === 'create'}>
                        {busy === 'create' ? 'Vytváram…' : 'Vytvoriť'}
                    </button>
                    {createErr && <p className={styles.error}>{createErr}</p>}
                </div>
            )}

            {groups.length === 0 && (
                <p className={styles.empty}>Zatiaľ žiadne skupiny. Vytvor prvú!</p>
            )}

            <div className={styles.list}>
                {groups.map(g => {
                    const isFounder = g.created_by === user.user_id;
                    const myStatus  = g.my_status;
                    const pendingCount = members[g.id]?.filter(m => m.status === 'pending').length ?? 0;

                    return (
                        <div key={g.id} className={styles.card}>
                            <div className={styles.cardTop}>
                                <div className={styles.cardInfo}>
                                    <span className={styles.groupName}>{g.name}</span>
                                    <span className={styles.meta}>
                                        {g.member_count} {Number(g.member_count) === 1 ? 'člen' : 'členov'}
                                        {' · '}zakladateľ: <strong>{g.creator_username}</strong>
                                    </span>
                                </div>
                                <div className={styles.cardActions}>
                                    {myStatus === null && (
                                        <button className={styles.btnJoin} onClick={() => doJoin(g.id)} disabled={!!busy}>
                                            {busy === `join-${g.id}` ? '…' : 'Vstúpiť'}
                                        </button>
                                    )}
                                    {myStatus === 'pending' && (
                                        <span className={styles.badgePending}>Čaká na schválenie</span>
                                    )}
                                    {myStatus === 'accepted' && !isFounder && (
                                        <button className={styles.btnLeave} onClick={() => doLeave(g.id)} disabled={!!busy}>
                                            Opustiť
                                        </button>
                                    )}
                                    {isFounder && (
                                        <>
                                            <button className={styles.btnManage} onClick={() => toggleExpand(g.id)}>
                                                {expanded === g.id ? 'Zavrieť' : `Členovia${pendingCount ? ` (${pendingCount})` : ''}`}
                                            </button>
                                            <button className={styles.btnDisband} onClick={() => doDisband(g.id)} disabled={!!busy}>
                                                Zrušiť
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {expanded === g.id && isFounder && (
                                <div className={styles.membersPanel}>
                                    {!members[g.id] ? (
                                        <p className={styles.emptySmall}>Načítavam…</p>
                                    ) : members[g.id].length === 0 ? (
                                        <p className={styles.emptySmall}>Žiadni členovia okrem teba.</p>
                                    ) : members[g.id].map(m => (
                                        <div key={m.user_id} className={styles.memberRow}>
                                            <span className={styles.memberName}>
                                                {m.first_name || m.username}{m.last_name ? ` ${m.last_name}` : ''}
                                                <small> @{m.username}</small>
                                            </span>
                                            {m.status === 'pending' ? (
                                                <div className={styles.memberActions}>
                                                    <button
                                                        className={styles.btnApprove}
                                                        onClick={() => doMemberAction(g.id, m.user_id, 'approve')}
                                                        disabled={busy === `member-${m.user_id}`}
                                                    >Prijať</button>
                                                    <button
                                                        className={styles.btnReject}
                                                        onClick={() => doMemberAction(g.id, m.user_id, 'reject')}
                                                        disabled={busy === `member-${m.user_id}`}
                                                    >Odmietnuť</button>
                                                </div>
                                            ) : (
                                                <span className={styles.badgeAccepted}>Člen</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
