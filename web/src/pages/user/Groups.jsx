import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getGroups, createGroup, disbandGroup, joinGroup, leaveGroup, getMembers, memberAction, inviteMember, acceptGroupInvite } from '../../api/groups';
import { getUser, getUsers } from '../../api/users';
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

    const [inviteQuery, setInviteQuery]     = useState('');
    const [inviteShowDrop, setInviteShowDrop] = useState(false);
    const [allUsers, setAllUsers]           = useState(null);
    const allUsersRef                       = useRef(null);
    const [inviteBusy, setInviteBusy]       = useState('');
    const [inviteErr, setInviteErr]         = useState('');

    const load = () => getGroups().then(setGroups).finally(() => setLoading(false));
    useEffect(() => { load(); }, []);

    useEffect(() => {
        setInviteQuery('');
        setInviteShowDrop(false);
        setInviteErr('');
    }, [expanded]);

    const loadMembers = (id) =>
        getMembers(id).then(data => setMembers(m => ({ ...m, [id]: data })));

    const toggleExpand = (id) => {
        if (expanded === id) { setExpanded(null); return; }
        setExpanded(id);
        if (!members[id]) loadMembers(id);
    };

    const ensureUsers = async () => {
        if (allUsersRef.current) return allUsersRef.current;
        const data = await getUsers();
        allUsersRef.current = data;
        setAllUsers(data);
        return data;
    };

    const getSuggestions = (groupId, query) => {
        const users = allUsersRef.current;
        if (!users) return [];
        const existing = new Set((members[groupId] || []).map(m => m.user_id));
        const lower = query.toLowerCase();
        return users
            .filter(u => Number(u.id) !== Number(user.user_id) && !existing.has(u.id))
            .filter(u => !query ||
                u.username.toLowerCase().includes(lower) ||
                (u.first_name || '').toLowerCase().includes(lower) ||
                (u.last_name  || '').toLowerCase().includes(lower)
            )
            .slice(0, 8);
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

    const doInvite = async (groupId) => {
        if (!inviteQuery.trim()) return;
        setInviteBusy(`invite-${groupId}`); setInviteErr('');
        try {
            await inviteMember(groupId, inviteQuery.trim());
            setInviteQuery(''); setInviteShowDrop(false);
            loadMembers(groupId); load();
        } catch (e) { setInviteErr(e.message); }
        finally { setInviteBusy(''); }
    };

    const doAcceptInvite = async (groupId) => {
        setBusy(`accept-${groupId}`);
        try { await acceptGroupInvite(groupId); loadMembers(groupId); load(); }
        catch (e) { alert(e.message); }
        finally { setBusy(''); }
    };

    const fullName = (u) =>
        (u.first_name || u.last_name) ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : u.username;

    const filtered = myOnly
        ? groups.filter(g => g.my_status === 'accepted' || g.my_status === 'invited' || g.created_by === user.user_id)
        : groups;

    if (loading) return <div className={styles.wrap}><p>Načítavam…</p></div>;

    return (
        <div className={styles.wrap}>
            <div className={styles.topBar}>
                <h2>Skupiny</h2>
                <div className={styles.topActions}>
                    <button className={myOnly ? styles.btnFilterActive : styles.btnFilter} onClick={() => setMyOnly(f => !f)}>
                        {myOnly ? 'Len moje' : 'Všetky'}
                    </button>
                    <button className={styles.btnNew} onClick={() => { setCreating(c => !c); setCreateErr(''); setNewName(''); }}>
                        {creating ? 'Zrušiť' : 'Nová skupina'}
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
                    const canInvite  = myStatus === 'accepted' || isFounder;
                    const suggestions = isOpen ? getSuggestions(g.id, inviteQuery) : [];

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
                                    {myStatus === 'invited' && (
                                        <span className={styles.badgeInvitedCard}>Pozvánka</span>
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
                                    {canInvite && (
                                        <div className={styles.inviteSection}>
                                            <div className={styles.inviteRow}>
                                                <div className={styles.inviteInputWrap}>
                                                    <input
                                                        className={styles.inviteInput}
                                                        placeholder="pozvi nového člena"
                                                        value={inviteQuery}
                                                        onChange={async e => {
                                                            const q = e.target.value;
                                                            setInviteQuery(q);
                                                            if (q.length >= 1) {
                                                                if (!allUsersRef.current) await ensureUsers();
                                                                setInviteShowDrop(true);
                                                            } else {
                                                                setInviteShowDrop(false);
                                                            }
                                                        }}
                                                        onDoubleClick={async () => {
                                                            if (!allUsersRef.current) await ensureUsers();
                                                            setInviteShowDrop(true);
                                                        }}
                                                        onFocus={() => { if (allUsersRef.current && inviteQuery) setInviteShowDrop(true); }}
                                                        onBlur={() => setTimeout(() => setInviteShowDrop(false), 150)}
                                                        onKeyDown={e => e.key === 'Enter' && doInvite(g.id)}
                                                    />
                                                    {inviteShowDrop && suggestions.length > 0 && (
                                                        <div className={styles.dropDown}>
                                                            {suggestions.map(u => (
                                                                <button
                                                                    key={u.id}
                                                                    className={styles.dropItem}
                                                                    onMouseDown={() => { setInviteQuery(u.username); setInviteShowDrop(false); }}
                                                                >
                                                                    <Avatar src={u.avatar} name={fullName(u)} size={24} />
                                                                    <span className={styles.dropName}>{fullName(u)}</span>
                                                                    <small className={styles.dropUser}>@{u.username}</small>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    className={styles.btnInvite}
                                                    disabled={!inviteQuery.trim() || inviteBusy === `invite-${g.id}`}
                                                    onClick={() => doInvite(g.id)}
                                                >
                                                    {inviteBusy === `invite-${g.id}` ? '…' : 'Pozvať'}
                                                </button>
                                            </div>
                                            {inviteErr && <p className={styles.inviteErr}>{inviteErr}</p>}
                                        </div>
                                    )}
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
                                            {m.status === 'invited' && Number(m.user_id) === Number(user.user_id) && (
                                                <button className={styles.btnAccept} onClick={() => doAcceptInvite(g.id)} disabled={busy === `accept-${g.id}`}>Akceptovať</button>
                                            )}
                                            {m.status === 'invited' && Number(m.user_id) !== Number(user.user_id) && (
                                                <span className={styles.badgeInvited}>pozvaný</span>
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
