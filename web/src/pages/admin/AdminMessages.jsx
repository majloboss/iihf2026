import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAdminThreads, getAdminThread, adminReply, adminDeleteMessage } from '../../api/messages';
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
    const [text, setText]         = useState('');
    const [sending, setSending]   = useState(false);
    const endRef = useRef(null);

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

    const send = async () => {
        const body = text.trim();
        if (!body || sending || !activeUser) return;
        setSending(true);
        try {
            const msg = await adminReply(activeUser, body);
            setMsgs(m => [...m, msg]);
            setText('');
            loadThreads();
        } catch (e) { alert(e.message); }
        finally { setSending(false); }
    };

    const remove = async (id) => {
        if (!confirm('Zmazať správu?')) return;
        try {
            await adminDeleteMessage(id);
            setMsgs(m => m.map(x => x.id === id ? { ...x, deleted_at: new Date().toISOString() } : x));
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
                                    <div className={styles.body}>{del ? 'Správa zmazaná' : m.body}</div>
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
                <div className={styles.composer}>
                    <textarea className={styles.input} placeholder="Odpoveď…" value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                        rows={1} maxLength={2000} />
                    <button className={styles.sendBtn} onClick={send} disabled={sending || !text.trim()}>
                        {sending ? '…' : 'Odoslať'}
                    </button>
                </div>
            </div>
        );
    }

    // Zoznam vlákien
    return (
        <div className={styles.wrap}>
            <h2 className={styles.title}>Správy od hráčov</h2>
            {threads.length === 0 ? (
                <p className={styles.muted}>Žiadne správy.</p>
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
        </div>
    );
}
