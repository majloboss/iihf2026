import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAdminThreads, getAdminThread, adminReply, adminDeleteMessage, uploadMessageImage } from '../../api/messages';
import { getUsers } from '../../api/users';
import styles from './AdminMessages.module.css';

const fmtTime = (iso) => {
    const d = new Date(iso);
    const t = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    const today = new Date().toDateString() === d.toDateString();
    return today ? t : `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')} ${t}`;
};

export default function AdminMessages() {
    const [params, setParams] = useSearchParams();
    const activeUser = params.get('user_id') ? parseInt(params.get('user_id')) : null;

    const [threads, setThreads]   = useState([]);
    const [msgs, setMsgs]         = useState([]);
    const [loading, setLoading]   = useState(true);
    const [hasText, setHasText]   = useState(false);
    const [sending, setSending]   = useState(false);
    const [pendingImg, setPendingImg] = useState(null);
    const [lightbox, setLightbox] = useState(null);
    const [newOpen, setNewOpen]   = useState(false);   // výber hráča pre novú konverzáciu
    const [allUsers, setAllUsers] = useState(null);
    const [userQuery, setUserQuery] = useState('');
    const endRef  = useRef(null);
    const fileRef = useRef(null);
    const inputRef = useRef(null);

    const loadThreads = useCallback(() =>
        getAdminThreads().then(d => setThreads(d.threads || [])).catch(() => {}), []);

    const loadThread = useCallback((uid) =>
        getAdminThread(uid).then(d => setMsgs(d.messages || [])).catch(() => {}), []);

    useEffect(() => { loadThreads().finally(() => setLoading(false)); }, [loadThreads]);

    useEffect(() => {
        if (!activeUser) { setMsgs([]); return; }
        loadThread(activeUser);
        const t = setInterval(() => loadThread(activeUser), 7000);
        return () => clearInterval(t);
    }, [activeUser, loadThread]);

    // polling zoznamu vlákien
    useEffect(() => {
        const t = setInterval(loadThreads, 15000);
        return () => clearInterval(t);
    }, [loadThreads]);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

    const open = (uid) => setParams({ user_id: String(uid) });
    const back = () => setParams({});

    const openNew = async () => {
        setNewOpen(true);
        setUserQuery('');
        if (!allUsers) {
            const data = await getUsers().catch(() => []);
            setAllUsers(data);
        }
    };
    const startConversation = (uid) => { setNewOpen(false); open(uid); };

    const pickImage = (file) => {
        if (!file || !file.type.startsWith('image/')) return;
        setPendingImg({ file, preview: URL.createObjectURL(file) });
    };
    const onPaste = (e) => {
        const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
        if (item) { e.preventDefault(); pickImage(item.getAsFile()); }
    };
    const onInput = () => setHasText(!!inputRef.current?.innerText.trim());
    const clearInput = () => { if (inputRef.current) inputRef.current.innerText = ''; setHasText(false); };

    const send = async () => {
        const body = (inputRef.current?.innerText || '').trim();
        if ((!body && !pendingImg) || sending || !activeUser) return;
        setSending(true);
        try {
            let image_url = null;
            if (pendingImg) { const up = await uploadMessageImage(pendingImg.file); image_url = up.image_url; }
            const msg = await adminReply(activeUser, body, image_url);
            setMsgs(m => [...m, msg]);
            clearInput();
            setPendingImg(null);
            loadThreads();
        } catch (e) { alert(e.message); }
        finally { setSending(false); }
    };

    const remove = async (id) => {
        if (!confirm('Zmazať správu?')) return;
        try {
            await adminDeleteMessage(id);
            setMsgs(m => m.map(x => x.id === id ? { ...x, deleted_at: new Date().toISOString(), body: null, image_url: null } : x));
        } catch (e) { alert(e.message); }
    };

    const activeThread = threads.find(t => t.user_id === activeUser);

    if (loading) return <div className={styles.wrap}><p>Načítavam…</p></div>;

    // Detail vlákna
    if (activeUser) {
        return (
            <div className={styles.wrap}>
                <div className={styles.detailHead}>
                    <button className={styles.backBtn} onClick={back}>‹ Späť</button>
                    <span className={styles.detailName}>{activeThread?.username || `User #${activeUser}`}</span>
                </div>
                <div className={styles.thread}>
                    {msgs.length === 0 ? <p className={styles.muted}>Žiadne správy.</p> : msgs.map(m => {
                        const mine = m.sender === 'admin';
                        const del  = !!m.deleted_at;
                        return (
                            <div key={m.id} className={`${styles.row} ${mine ? styles.rowMine : styles.rowUser}`}>
                                <div className={`${styles.bubble} ${mine ? styles.bubbleMine : styles.bubbleUser} ${del ? styles.bubbleDeleted : ''}`}>
                                    {del ? (
                                        <div className={styles.body}>Správa zmazaná</div>
                                    ) : (
                                        <>
                                            {m.image_url && <img src={m.image_url} alt="" className={styles.msgImg} onClick={() => setLightbox(m.image_url)} />}
                                            {m.body && <div className={styles.body}>{m.body}</div>}
                                        </>
                                    )}
                                    <div className={styles.meta}>
                                        {fmtTime(m.created_at)}
                                        {mine && !del && m.read_at && <span> ✓ prečítané</span>}
                                        {mine && !del && <button className={styles.delBtn} onClick={() => remove(m.id)}>✕</button>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={endRef} />
                </div>
                {pendingImg && (
                    <div className={styles.preview}>
                        <img src={pendingImg.preview} alt="" className={styles.previewImg} />
                        <button className={styles.previewRemove} onClick={() => setPendingImg(null)}>✕ Odobrať</button>
                    </div>
                )}
                <div className={styles.composer}>
                    <button className={styles.attachBtn} onClick={() => fileRef.current?.click()} title="Pridať obrázok / foto">📎</button>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => { pickImage(e.target.files?.[0]); e.target.value = ''; }} />
                    <div ref={inputRef} className={styles.input} contentEditable role="textbox"
                        data-placeholder="Odpoveď…"
                        onInput={onInput}
                        onPaste={onPaste}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
                    <button className={styles.sendBtn} onClick={send} disabled={sending || (!hasText && !pendingImg)}>
                        {sending ? '…' : 'Odoslať'}
                    </button>
                </div>
                {lightbox && (
                    <div className={styles.lightbox} onClick={() => setLightbox(null)}>
                        <img src={lightbox} alt="" className={styles.lightboxImg} />
                    </div>
                )}
            </div>
        );
    }

    // Filtrovaní hráči pre výber novej konverzácie
    const filteredUsers = (allUsers || []).filter(u => {
        const q = userQuery.toLowerCase();
        return !q || u.username.toLowerCase().includes(q)
            || (u.first_name || '').toLowerCase().includes(q)
            || (u.last_name || '').toLowerCase().includes(q);
    });

    // Zoznam vlákien
    return (
        <div className={styles.wrap}>
            <div className={styles.listHead}>
                <h2 className={styles.title}>Správy od hráčov</h2>
                <button className={styles.newBtn} onClick={openNew}>✎ Nová správa</button>
            </div>
            {threads.length === 0 ? (
                <p className={styles.muted}>Žiadne správy. Začni konverzáciu tlačidlom „Nová správa“.</p>
            ) : (
                <div className={styles.list}>
                    {threads.map(t => (
                        <button key={t.user_id} className={styles.threadRow} onClick={() => open(t.user_id)}>
                            {t.avatar
                                ? <img src={t.avatar} className={styles.avatar} alt="" />
                                : <span className={styles.avatarPh}>{t.username[0].toUpperCase()}</span>}
                            <div className={styles.threadInfo}>
                                <div className={styles.threadName}>{t.username}</div>
                                <div className={styles.threadLast}>{t.last_body || ''}</div>
                            </div>
                            <div className={styles.threadRight}>
                                {t.last_at && <span className={styles.threadTime}>{fmtTime(t.last_at)}</span>}
                                {t.unread > 0 && <span className={styles.unreadDot}>{t.unread}</span>}
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {newOpen && (
                <div className={styles.overlay} onClick={() => setNewOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHead}>
                            <span>Vyber hráča</span>
                            <button className={styles.modalClose} onClick={() => setNewOpen(false)}>✕</button>
                        </div>
                        <input className={styles.modalSearch} autoFocus placeholder="Hľadať hráča…"
                            value={userQuery} onChange={e => setUserQuery(e.target.value)} />
                        <div className={styles.modalList}>
                            {!allUsers ? (
                                <p className={styles.muted}>Načítavam…</p>
                            ) : filteredUsers.length === 0 ? (
                                <p className={styles.muted}>Nikto nenájdený.</p>
                            ) : filteredUsers.map(u => (
                                <button key={u.id} className={styles.modalUser} onClick={() => startConversation(u.id)}>
                                    {u.avatar
                                        ? <img src={u.avatar} className={styles.avatar} alt="" />
                                        : <span className={styles.avatarPh}>{u.username[0].toUpperCase()}</span>}
                                    <div className={styles.threadInfo}>
                                        <div className={styles.threadName}>{u.username}</div>
                                        {(u.first_name || u.last_name) && (
                                            <div className={styles.threadLast}>{`${u.first_name || ''} ${u.last_name || ''}`.trim()}</div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
