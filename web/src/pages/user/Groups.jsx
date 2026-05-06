import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getGroups, createGroup, disbandGroup, joinGroup, leaveGroup, getMembers, memberAction } from '../../api/groups';
import { getUser } from '../../api/users';
import styles from './Groups.module.css';

function Avatar({ src, name, size = 32 }) {
    const initial = (name || '?').trim().slice(0, 1).toUpperCase();
    if (src) return <img className={styles.avatar} src={src} alt={name} style={{ width: size, height: size }} />;
    return <div className={styles.avatarFallback} style={{ width: size, height: size, fontSize: size * 0.38 }}>{initial}</div>;
}

export default function Groups() {
    const { user } = useAuth();
    const [groups, setGroups]       = useState([]);
    const [loading, setLoading]     = useState(true);
    const [myOnly, setMyOnly]       = useState(false);
    const [creating, setCreating]   = useState(false);
    const [newName, setNewName]     = useState('');
    const [createErr, setCreateErr] = useState('');
    const [busy, setBusy]           = useState('');
    const [expanded, setExpanded]   = useState(null);
    const [members, setMembers]     = useState({});
    const [userDetail, setUserDetail] = useState(null);

    const load = () => getGroups().then(setGroups).finally(() => setLoading(false));
    useEffect(() => { load(); }, []);

    const loadMembers = (id) =>
        getMembers(id).then(data => setMembers(m => ({ ...m, [id]: data })));

    const toggleExpand = (id) => {
        if (expanded === id) { setExpanded(null); return; }
        setExpanded(id);
        if (!members[id]) loadMembers(id);
    };

    const openDetail = async (uid) => {
        setUserDetail({ loading: true });
        try {
            const data = await getUser(uid);
            setUserDetail({ loading: false, data });
        } catch { setUserDetail(null); }
    };

    const doCreate = async () => {
        if (!newName.trim()) return;
        setBusy('create'); setCreateErr('');
        try {
            await createGroup(newName.trim());
            setNewName(''); setCreating(false); load();
        } catch (e) { setCreateErr(e.message); }
        finally { setBusy(''); }
    };

    const doJoin = async (id) => {
        setBusy(`join-${id}`);
        try { await joinGroup(id); load(); }
        catch (e) { alert(e.message); }
        finally { setBusy(''); }
    };

    const doLeave = async (id) => {
        if (!confirm('Naozaj chceš opustiť skupinu?')) return;
        setBusy(`leave-${id}`);
        try { await leaveGroup(id); load(); }
        catch (e) { alert(e.message); }
        finally { setBusy(''); }
    };

    const doDisband = async (id) => {
        if (!confirm('Naozaj chceš zrušiť skupinu?')) return;
        setBusy(`disband-${id}`);
        try { await disbandGroup(id); load(); }
        catch (e) { alert(e.message); }
        finally { setBusy(''); }
    };

    const doMemberAction = async (group_id, uid, action) => {
        setBusy(`m-${uid}`);
        try {
            await memberAction(group_id, uid, action);
            loadMembers(group_id); load();
        } catch (e) { alert(e.message); }
        finally { setBusy(''); }
    };

    const fullName = (u) =>
        (u.first_name || u.last_name) ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : u.username;

    const filtered = myOnly
        ? groups.filter(g => g.my_status === 'accepted' || g.created_by === user.user_id)
        : groups;

    if (loading) return <div className={styles.wrap}><p>Načítavam…</p></div>;

    return (
        <div className={styles.wrap}>
            <div className={styles.topBar}>
                <h2>Skupiny priateľov</h2>
                <div className={styles.topActions}>
                    <label className={styles.filterLabel}>
                        <input type="checkbox" checked={myOnly} onChange={e => setMyOnly(e.target.checked)} />
                        Iba moje skupiny
                    </label>
                    <button className={styles.btnNew} onClick={() => { setCreating(c => !c); setCreateErr(''); setNewName(''); }}>
                        {creating ? 'Zrušiť' : '+ Nová skupina'}
                    </button>
                </div>
            </div>

            {creating && (
                <div className={styles.createForm}>
                    <input autoFocus placeholder="Názov skupiny" value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && doCreate()} />
                    <button className={styles.btn} onClick={doCreate} disabled={busy === 'create'}>
                        {busy === 'create' ? 'Vytváram…' : 'Vytvoriť'}
                    </button>
                    {createErr && <p className={styles.error}>{createErr}</p>}
                </div>
            )}

            {filtered.length === 0 && (
                <p className={styles.empty}>{myOnly ? 'Nie si členom žiadnej skupiny.' : 'Zatiaľ žiadne skupiny.'}</p>
            )}

            <div className={styles.list}>
                {filtered.map(g => {
                    const isFounder  = g.created_by === user.user_id;
                    const myStatus   = g.my_status;
                    const isOpen     = expanded === g.id;
                    const grpMembers = members[g.id];
                    const pendingCnt = grpMembers?.filter(m => m.status === 'pending').length ?? 0;

                    return (
                        <div key={g.id} className={styles.card}>
                            <div className={styles.cardHeader} onClick={() => toggleExpand(g.id)}>
                                <div className={styles.cardLeft}>
                                    <span className={styles.chevron}>{isOpen ? '▾' : '▸'}</span>
                                    <div className={styles.groupInfo}>
                                        <span className={styles.groupName}>{g.name}</span>
                                        <span className={styles.meta}>
                                            {g.member_count} {Number(g.member_count) === 1 ? 'člen' : 'členov'}
                                            {' · '}zakladateľ: {g.creator_username}
                                        </span>
                                    </div>
                                    {isFounder && pendingCnt > 0 && (
                                        <span className={styles.badgePending}>{pendingCnt} čaká</span>
                                    )}
                                </div>
                                <div className={styles.cardActions} onClick={e => e.stopPropagation()}>
                                    {myStatus === null && (
                                        <button className={styles.btnJoin} onClick={() => doJoin(g.id)} disabled={!!busy}>Vstúpiť</button>
                                    )}
                                    {myStatus === 'pending' && (
                                        <span className={styles.badgePendingMine}>Čaká na schválenie</span>
                                    )}
                                    {myStatus === 'accepted' && !isFounder && (
                                        <button className={styles.btnLeave} onClick={() => doLeave(g.id)} disabled={!!busy}>Opustiť</button>
                                    )}
                                    {isFounder && (
                                        <button className={styles.btnDisband} onClick={() => doDisband(g.id)} disabled={!!busy}>Zrušiť</button>
                                    )}
                                </div>
                            </div>

                            {isOpen && (
                                <div className={styles.membersList}>
                                    {!grpMembers ? (
                                        <p className={styles.emptySmall}>Načítavam…</p>
                                    ) : grpMembers.length === 0 ? (
                                        <p className={styles.emptySmall}>Žiadni členovia.</p>
                                    ) : grpMembers.map(m => (
                                        <div key={m.user_id} className={styles.memberRow}>
                                            <button className={styles.memberBtn} onClick={() => openDetail(m.user_id)}>
                                                <Avatar src={m.avatar} name={fullName(m)} size={32} />
                                                <span className={styles.memberName}>{fullName(m)}</span>
                                                <small className={styles.memberUser}>@{m.username}</small>
                                            </button>
                                            {m.status === 'pending' && isFounder && (
                                                <div className={styles.approveActions}>
                                                    <button className={styles.btnApprove} onClick={() => doMemberAction(g.id, m.user_id, 'approve')} disabled={busy === `m-${m.user_id}`}>Prijať</button>
                                                    <button className={styles.btnReject}  onClick={() => doMemberAction(g.id, m.user_id, 'reject')}  disabled={busy === `m-${m.user_id}`}>Odmietnuť</button>
                                                </div>
                                            )}
                                            {m.status === 'pending' && !isFounder && (
                                                <span className={styles.badgeWait}>čaká</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {userDetail && (
                <div className={styles.overlay} onClick={() => setUserDetail(null)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <button className={styles.close} onClick={() => setUserDetail(null)}>✕</button>
                        {userDetail.loading ? (
                            <p className={styles.modalLoading}>Načítavam…</p>
                        ) : (
                            <>
                                <div className={styles.modalAvatarWrap}>
                                    <Avatar src={userDetail.data.avatar} name={fullName(userDetail.data)} size={80} />
                                </div>
                                <h3 className={styles.modalName}>{fullName(userDetail.data)}</h3>
                                <p className={styles.modalUsername}>@{userDetail.data.username}</p>

                                <div className={styles.modalFields}>
                                    <div className={styles.modalField}>
                                        <span className={styles.modalLabel}>Meno</span>
                                        <span className={styles.modalValue}>{userDetail.data.first_name || '—'}</span>
                                    </div>
                                    <div className={styles.modalField}>
                                        <span className={styles.modalLabel}>Priezvisko</span>
                                        <span className={styles.modalValue}>{userDetail.data.last_name || '—'}</span>
                                    </div>
                                    <div className={styles.modalField}>
                                        <span className={styles.modalLabel}>Email</span>
                                        {userDetail.data.email
                                            ? <a className={styles.modalLink} href={`mailto:${userDetail.data.email}`}>{userDetail.data.email}</a>
                                            : <span className={styles.modalValue}>—</span>
                                        }
                                    </div>
                                    <div className={styles.modalField}>
                                        <span className={styles.modalLabel}>Telefón</span>
                                        {userDetail.data.phone
                                            ? <a className={styles.modalLink} href={`tel:${userDetail.data.phone}`}>{userDetail.data.phone}</a>
                                            : <span className={styles.modalValue}>—</span>
                                        }
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
