import { useState, useEffect, useRef, useCallback } from 'react';
import { getMessages, sendMessage, deleteMessage } from '../../api/messages';
import styles from './Messages.module.css';

const fmtTime = (iso) => {
    const d = new Date(iso);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    const t = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    if (sameDay) return t;
    return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')} ${t}`;
};

export default function Messages() {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading]   = useState(true);
    const [text, setText]         = useState('');
    const [sending, setSending]   = useState(false);
    const endRef  = useRef(null);
    const initial = useRef(true);

    const load = useCallback(() => {
        return getMessages()
            .then(d => setMessages(d.messages || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

    // Polling kým je obrazovka otvorená
    useEffect(() => {
        const t = setInterval(load, 7000);
        return () => clearInterval(t);
    }, [load]);

    // Scroll na koniec po načítaní/novej správe
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: initial.current ? 'auto' : 'smooth' });
        initial.current = false;
    }, [messages]);

    const send = async () => {
        const body = text.trim();
        if (!body || sending) return;
        setSending(true);
        try {
            const msg = await sendMessage(body);
            setMessages(m => [...m, msg]);
            setText('');
        } catch (e) { alert(e.message); }
        finally { setSending(false); }
    };

    const remove = async (id) => {
        if (!confirm('Zmazať správu?')) return;
        try {
            await deleteMessage(id);
            setMessages(m => m.map(x => x.id === id ? { ...x, deleted_at: new Date().toISOString() } : x));
        } catch (e) { alert(e.message); }
    };

    return (
        <div className={styles.wrap}>
            <div className={styles.header}>
                <img src="/menu_spravy.png" alt="" className={styles.headerIcon} />
                <div>
                    <div className={styles.headerTitle}>Správy s adminom</div>
                    <div className={styles.headerSub}>Otázky, nahlásenie chyby vo výsledku…</div>
                </div>
            </div>

            <div className={styles.thread}>
                {loading ? (
                    <p className={styles.muted}>Načítavam…</p>
                ) : messages.length === 0 ? (
                    <p className={styles.empty}>Zatiaľ žiadne správy. Napíšte adminovi čokoľvek.</p>
                ) : messages.map(m => {
                    const mine = m.sender === 'user';
                    const del  = !!m.deleted_at;
                    return (
                        <div key={m.id} className={`${styles.row} ${mine ? styles.rowMine : styles.rowAdmin}`}>
                            <div className={`${styles.bubble} ${mine ? styles.bubbleMine : styles.bubbleAdmin} ${del ? styles.bubbleDeleted : ''}`}>
                                {!mine && <div className={styles.sender}>Admin</div>}
                                <div className={styles.body}>{del ? 'Správa zmazaná' : m.body}</div>
                                <div className={styles.meta}>
                                    {fmtTime(m.created_at)}
                                    {mine && !del && m.read_at && <span className={styles.read}> ✓ prečítané</span>}
                                    {mine && !del && (
                                        <button className={styles.delBtn} onClick={() => remove(m.id)} title="Zmazať">✕</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={endRef} />
            </div>

            <div className={styles.composer}>
                <textarea
                    className={styles.input}
                    placeholder="Napíšte správu…"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                    rows={1}
                    maxLength={2000}
                />
                <button className={styles.sendBtn} onClick={send} disabled={sending || !text.trim()}>
                    {sending ? '…' : 'Odoslať'}
                </button>
            </div>
        </div>
    );
}
