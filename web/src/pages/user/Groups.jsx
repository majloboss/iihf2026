import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCompetition } from '../../context/CompetitionContext';
import { getViewers, addViewer, removeViewer, getGroups, getAllMyGroups, createGroup, disbandGroup, joinGroup, leaveGroup, getMembers, memberAction, inviteMember, acceptGroupInvite, bulkInvite, updateGroupDescription, updateGroupFlags } from '../../api/groups';
import { getUser, getUsers } from '../../api/users';
import styles from './Groups.module.css';

function Avatar({ src, name, size = 32 }) {
    const initial = (name || '?').trim().slice(0, 1).toUpperCase();
    if (src) return <img className={styles.avatar} src={src} alt={name} style={{ width: size, height: size }} />;
    return <div className={styles.avatarFallback} style={{ width: size, height: size, fontSize: size * 0.38 }}>{initial}</div>;
}

export default function Groups() {
    const { user } = useAuth();
    const { activeCompetition } = useCompetition();
    const compId = activeCompetition?.id ?? null;

    const [groups, setGroups]       = useState([]);
    const [loading, setLoading]     = useState(true);
    const [myOnly, setMyOnly]       = useState(false);
    const [creating, setCreating]   = useState(false);
    const [newName, setNewName]     = useState('');
    const [newDesc, setNewDesc]     = useState('');
    // Skrytú skupinu vidia iba vymenovaní — vstup si však musia vypýtať
    // žiadosťou ako ktokoľvek iný.
    const [newSkryta, setNewSkryta]  = useState(false);
    // Kto vidí skrytú skupinu: { [groupId]: [ {user_id, username, ...} ] }
    const [viewers, setViewers]      = useState({});
    const [viewerQuery, setViewerQuery] = useState('');
    // Dvojklik do prázdneho poľa vyroluje celý zoznam, rovnako ako pri pozývaní.
    const [viewerShowDrop, setViewerShowDrop] = useState(false);
    const [createErr, setCreateErr] = useState('');
    const [busy, setBusy]           = useState('');
    const [editDescId, setEditDescId] = useState(null);
    const [editDescVal, setEditDescVal] = useState('');
    const [expanded, setExpanded]   = useState(null);
    const [members, setMembers]     = useState({});
    const [userDetail, setUserDetail] = useState(null);

    const [inviteQuery, setInviteQuery]     = useState('');
    const [inviteShowDrop, setInviteShowDrop] = useState(false);
    const [allUsers, setAllUsers]           = useState(null);
    const allUsersRef                       = useRef(null);
    const [inviteBusy, setInviteBusy]       = useState('');
    const [inviteErr, setInviteErr]         = useState('');

    // Bulk invite state
    const [bulkOpenFor, setBulkOpenFor]     = useState(null);   // group_id pre ktorú je otvorený panel
    const [allMyGroups, setAllMyGroups]     = useState(null);   // všetky skupiny usera naprieč súťažami
    const [bulkSource, setBulkSource]       = useState('');     // vybraná zdrojová skupina
    const [bulkBusy, setBulkBusy]           = useState(false);
    const [bulkResult, setBulkResult]       = useState(null);   // { invited, skipped }
    const [bulkErr, setBulkErr]             = useState('');

    const load = () => getGroups(compId).then(setGroups).finally(() => setLoading(false));
    useEffect(() => { load(); }, [compId]);

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
        // Zoznam vidiacich má zmysel len pri skrytej skupine a vidí ho zakladateľ.
        const g = groups.find(x => x.id === id);
        if (g?.visibility === 'invite' && !viewers[id]) loadViewers(id);
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
        if (!compId) { setCreateErr('Najprv vyber súťaž v Profile'); return; }
        setBusy('create'); setCreateErr('');
        try {
            await createGroup(newName.trim(), compId, newDesc.trim() || null, newSkryta ? 'invite' : 'public');
            setNewName(''); setNewDesc(''); setNewSkryta(false); setCreating(false); load();
        } catch (e) { setCreateErr(e.message); }
        finally { setBusy(''); }
    };

    const saveDesc = async (groupId) => {
        setBusy(`desc-${groupId}`);
        try {
            await updateGroupDescription(groupId, editDescVal.trim() || null);
            setEditDescId(null); load();
        } catch (e) { alert(e.message); }
        finally { setBusy(''); }
    };

    const loadViewers = async (groupId) => {
        try {
            const zoznam = await getViewers(groupId);
            setViewers(v => ({ ...v, [groupId]: zoznam }));
        }
        catch { /* zoznam vidí iba zakladateľ — inému ho netreba */ }
    };

    const pridajVidiaceho = async (groupId, userId) => {
        setBusy(`viewer-${groupId}`);
        try { await addViewer(groupId, userId); await loadViewers(groupId); setViewerQuery(''); }
        catch (e) { alert(e.message); }
        finally { setBusy(''); }
    };

    const odoberVidiaceho = async (groupId, userId) => {
        setBusy(`viewer-${groupId}`);
        try { await removeViewer(groupId, userId); await loadViewers(groupId); }
        catch (e) { alert(e.message); }
        finally { setBusy(''); }
    };

    const toggleFlag = async (groupId, flag, value) => {
        setBusy(`flag-${groupId}`);
        try {
            await updateGroupFlags(groupId, { [flag]: value });
            load();
        } catch (e) { alert(e.message); }
        finally { setBusy(''); }
    };

    const openBulkInvite = async (groupId) => {
        if (bulkOpenFor === groupId) { setBulkOpenFor(null); return; }
        setBulkOpenFor(groupId); setBulkSource(''); setBulkResult(null); setBulkErr('');
        setAllMyGroups(null);
        const data = await getAllMyGroups().catch(() => []);
        setAllMyGroups(data);
    };

    const doBulkInvite = async (groupId) => {
        if (!bulkSource) { setBulkErr('Vyber zdrojovú skupinu'); return; }
        setBulkBusy(true); setBulkErr(''); setBulkResult(null);
        try {
            const res = await bulkInvite(groupId, parseInt(bulkSource));
            setBulkResult(res);
            load(); loadMembers(groupId);
        } catch (e) { setBulkErr(e.message); }
        finally { setBulkBusy(false); }
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

    // Hráčske meno je hlavný identifikátor, celé meno len upresňuje.
    const realName = (u) =>
        (u.first_name || u.last_name) ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : '';

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
                    <textarea
                        placeholder="Popis / podmienka vstupu (voliteľné)"
                        value={newDesc}
                        onChange={e => setNewDesc(e.target.value)}
                        maxLength={1000}
                        rows={2}
                        style={{ width:'100%', boxSizing:'border-box', padding:'8px 10px', border:'1px solid #ddd', borderRadius:6, fontSize:'0.88rem', resize:'vertical', marginTop:8 }}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '8px 0',
                                    fontSize: '0.85rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={newSkryta}
                               onChange={e => setNewSkryta(e.target.checked)}
                               style={{ width: 'auto', margin: 0 }} />
                        <span>Skrytá skupina — uvidia ju len ľudia, ktorých vymenuješ</span>
                    </label>
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
                    // Po rozbalení počítaj z načítaných členov (je čerstvejšie),
                    // inak použi hodnotu z API — nech je počet vidieť aj zabalený.
                    const invitedCnt = grpMembers
                        ? grpMembers.filter(m => m.status === 'invited').length
                        : Number(g.invited_count) || 0;
                    const pendingCnt = grpMembers
                        ? grpMembers.filter(m => m.status === 'pending').length
                        : Number(g.pending_count) || 0;
                    const isClosed   = !!g.is_closed;
                    const allowMemberInvite = g.allow_member_invite !== false;
                    // Pozývať môže: zakladateľ vždy (ak nie je uzavretá); člen len ak skupina povoľuje
                    // V skrytej skupine sa nepozýva: pozvánka je zároveň vstupenka,
                    // takže by obišla podmienku vstupu. Tam sa ľudia vymenúvajú
                    // a o vstup si žiadajú sami.
                    const jeSkryta   = g.visibility === 'invite';
                    const canInvite  = !isClosed && !jeSkryta
                        && (isFounder || (myStatus === 'accepted' && allowMemberInvite));
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
                                            {invitedCnt > 0 && <>{' · '}{invitedCnt} {invitedCnt === 1 ? 'pozvánka' : invitedCnt < 5 ? 'pozvánky' : 'pozvánok'}</>}
                                            {pendingCnt > 0 && <>{' · '}{pendingCnt} {pendingCnt === 1 ? 'žiadosť' : pendingCnt < 5 ? 'žiadosti' : 'žiadostí'}</>}
                                            {' · '}zakladateľ: {g.creator_username}
                                        </span>
                                        {g.description && (
                                            <span className={styles.meta} style={{ color:'#555', fontStyle:'italic', whiteSpace:'pre-wrap' }}>
                                                {g.description}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className={styles.cardActions} onClick={e => e.stopPropagation()}>
                                    {g.visibility === 'invite' && (
                                        <span className={styles.badgeClosed} title="V zozname ju vidia len pozvaní">
                                            👁 Skrytá
                                        </span>
                                    )}
                                    {isClosed && (
                                        <span className={styles.badgeClosed}>🔒 Uzavretá</span>
                                    )}
                                    {myStatus === null && !isClosed && (
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
                                    {isFounder && (
                                        <div className={styles.inviteSection}>
                                            {editDescId === g.id ? (
                                                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                                                    <textarea value={editDescVal} onChange={e => setEditDescVal(e.target.value)}
                                                        maxLength={1000} rows={2} placeholder="Popis / podmienka vstupu"
                                                        style={{ width:'100%', boxSizing:'border-box', padding:'8px 10px', border:'1px solid #ddd', borderRadius:6, fontSize:'0.88rem', resize:'vertical' }} />
                                                    <div style={{ display:'flex', gap:8 }}>
                                                        <button className={styles.btnInvite} disabled={busy === `desc-${g.id}`} onClick={() => saveDesc(g.id)}>
                                                            {busy === `desc-${g.id}` ? '…' : 'Uložiť popis'}
                                                        </button>
                                                        <button className={styles.btnLeave} onClick={() => setEditDescId(null)}>Zrušiť</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button className={styles.btnBulk} onClick={() => { setEditDescId(g.id); setEditDescVal(g.description || ''); }}>
                                                    ✎ {g.description ? 'Upraviť popis / podmienku' : 'Pridať popis / podmienku vstupu'}
                                                </button>
                                            )}
                                            <div className={styles.flagsRow}>
                                                <label className={styles.flagLabel}>
                                                    <input type="checkbox"
                                                        checked={allowMemberInvite}
                                                        disabled={busy === `flag-${g.id}`}
                                                        onChange={e => toggleFlag(g.id, 'allow_member_invite', e.target.checked)} />
                                                    Členovia môžu pozývať
                                                </label>
                                                <label className={styles.flagLabel}>
                                                    <input type="checkbox"
                                                        checked={isClosed}
                                                        disabled={busy === `flag-${g.id}`}
                                                        onChange={e => toggleFlag(g.id, 'is_closed', e.target.checked)} />
                                                    Uzavretá skupina (bez pozvánok a žiadostí)
                                                </label>
                                                <label className={styles.flagLabel}>
                                                    <input type="checkbox"
                                                        checked={g.visibility === 'invite'}
                                                        disabled={busy === `flag-${g.id}`}
                                                        onChange={e => toggleFlag(g.id, 'visibility', e.target.checked ? 'invite' : 'public')} />
                                                    Skrytá skupina (vidia ju len vymenovaní nižšie)
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {/* Skrytá skupina: kto ju vidí. Vymenovanie nie je pozvánka —
                                        títo ľudia musia o vstup požiadať a splniť podmienku. */}
                                    {isFounder && jeSkryta && (
                                        <div className={styles.inviteSection}>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>
                                                Kto vidí túto skupinu
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: 8 }}>
                                                Vymenovaní uvidia skupinu v zozname aj s podmienkou vstupu.
                                                O vstup si musia požiadať sami — ty ich schvaľuješ ako doteraz.
                                            </div>

                                            <div className={styles.inviteRow}>
                                                <div className={styles.inviteInputWrap}>
                                                    <input
                                                        className={styles.inviteInput}
                                                        placeholder="meno používateľa"
                                                        value={viewerQuery}
                                                        onChange={async e => {
                                                            setViewerQuery(e.target.value);
                                                            if (!allUsersRef.current) await ensureUsers();
                                                            setViewerShowDrop(true);
                                                        }}
                                                        onDoubleClick={async () => {
                                                            if (!allUsersRef.current) await ensureUsers();
                                                            setViewerShowDrop(true);
                                                        }}
                                                        onFocus={() => { if (allUsersRef.current && viewerQuery) setViewerShowDrop(true); }}
                                                        onBlur={() => setTimeout(() => setViewerShowDrop(false), 150)}
                                                    />
                                                    {viewerShowDrop && (() => {
                                                        const uz = new Set((viewers[g.id] || []).map(v => v.user_id));
                                                        const q = viewerQuery.toLowerCase();
                                                        const navrhy = (allUsersRef.current || [])
                                                            .filter(u => Number(u.id) !== Number(user.user_id) && !uz.has(u.id))
                                                            .filter(u => !q
                                                                || u.username.toLowerCase().includes(q)
                                                                || (u.first_name || '').toLowerCase().includes(q)
                                                                || (u.last_name || '').toLowerCase().includes(q));
                                                        if (!navrhy.length) return null;
                                                        return (
                                                            <div className={styles.dropDown}>
                                                                {navrhy.map(u => (
                                                                    <div key={u.id} className={styles.dropItem}
                                                                         onClick={() => pridajVidiaceho(g.id, u.id)}>
                                                                        {u.username}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            {(viewers[g.id] || []).length === 0
                                                ? <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: 6 }}>
                                                      Zatiaľ nikto — skupinu vidíš iba ty.
                                                  </div>
                                                : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                                                      {viewers[g.id].map(v => (
                                                          <span key={v.user_id}
                                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                                                                         background: '#eef2f8', borderRadius: 14,
                                                                         padding: '3px 6px 3px 10px', fontSize: '0.82rem' }}>
                                                              {v.username}
                                                              {v.member_status === 'accepted' && (
                                                                  <span style={{ color: '#28a745', fontSize: '0.72rem' }}>člen</span>
                                                              )}
                                                              {v.member_status === 'pending' && (
                                                                  <span style={{ color: '#e67e22', fontSize: '0.72rem' }}>žiada o vstup</span>
                                                              )}
                                                              {!v.member_status && (
                                                                  <span style={{ color: '#aaa', fontSize: '0.72rem' }}>vidí</span>
                                                              )}
                                                              <button onClick={() => odoberVidiaceho(g.id, v.user_id)}
                                                                      disabled={busy === `viewer-${g.id}`}
                                                                      title="Odobrať zo zoznamu"
                                                                      style={{ border: 'none', background: 'none', cursor: 'pointer',
                                                                               color: '#999', fontSize: '1rem', lineHeight: 1, padding: 0 }}>
                                                                  ×
                                                              </button>
                                                          </span>
                                                      ))}
                                                  </div>}
                                        </div>
                                    )}

                                    {canInvite && (
                                        <div className={styles.inviteSection}>
                                            <div className={styles.inviteRow}>
                                                <div className={styles.inviteInputWrap}>
                                                    <input
                                                        className={styles.inviteInput}
                                                        placeholder="meno alebo email"
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
                                                                    <span className={styles.dropName}>{u.username}</span>
                                                                    {realName(u) && <small className={styles.dropUser}>({realName(u)})</small>}
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
                                                {isFounder && (
                                                    <button
                                                        className={styles.btnBulk}
                                                        onClick={() => openBulkInvite(g.id)}
                                                    >
                                                        {bulkOpenFor === g.id ? '▲ Zavrieť' : 'Pozvať zo skupiny'}
                                                    </button>
                                                )}
                                            </div>
                                            {inviteErr && <p className={styles.inviteErr}>{inviteErr}</p>}

                                            {/* Bulk invite panel — len zakladateľ */}
                                            {isFounder && bulkOpenFor === g.id && (
                                                <div className={styles.bulkPanel}>
                                                    {!allMyGroups
                                                        ? <p className={styles.emptySmall}>Načítavam skupiny…</p>
                                                        : <>
                                                            <div className={styles.bulkRow}>
                                                                <select
                                                                    className={styles.bulkSelect}
                                                                    value={bulkSource}
                                                                    onChange={e => { setBulkSource(e.target.value); setBulkResult(null); setBulkErr(''); }}
                                                                >
                                                                    <option value="">— vyber zdrojovú skupinu —</option>
                                                                    {allMyGroups
                                                                        .filter(sg => sg.id !== g.id && sg.my_status === 'accepted' && sg.allow_member_invite !== false)
                                                                        .map(sg => (
                                                                            <option key={sg.id} value={sg.id}>
                                                                                {sg.name} {sg.competition_name ? `(${sg.competition_name})` : ''}
                                                                            </option>
                                                                        ))
                                                                    }
                                                                </select>
                                                                <button
                                                                    className={styles.btnBulkSend}
                                                                    disabled={!bulkSource || bulkBusy}
                                                                    onClick={() => doBulkInvite(g.id)}
                                                                >
                                                                    {bulkBusy ? 'Pozývam…' : 'Pozvať členov'}
                                                                </button>
                                                            </div>
                                                            {bulkErr && <p className={styles.inviteErr}>{bulkErr}</p>}
                                                            {bulkResult && (
                                                                <p className={styles.bulkOk}>
                                                                    ✓ {bulkResult.invited} pozvaniek odoslaných
                                                                    {bulkResult.skipped > 0 && `, ${bulkResult.skipped} preskočených (už v skupine)`}
                                                                </p>
                                                            )}
                                                        </>
                                                    }
                                                </div>
                                            )}
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
                                                <span className={styles.memberName}>{m.username}</span>
                                                {realName(m) && <small className={styles.memberUser}>({realName(m)})</small>}
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
                                                isFounder
                                                    ? <button className={styles.btnCancelInvite} onClick={() => doMemberAction(g.id, m.user_id, 'cancel_invite')} disabled={busy === `m-${m.user_id}`}>Zrušiť pozvánku</button>
                                                    : <span className={styles.badgeInvited}>pozvaný</span>
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
                                <h3 className={styles.modalName}>{userDetail.data.username}</h3>
                                {realName(userDetail.data) && <p className={styles.modalUsername}>{realName(userDetail.data)}</p>}

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
