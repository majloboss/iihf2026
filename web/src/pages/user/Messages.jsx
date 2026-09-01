import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getMessages, sendMessage, deleteMessage, uploadMessageImage } from '../../api/messages';
import OrganizerMessages from './OrganizerMessages';
import styles from './Messages.module.css';

const fmtTime = (iso) => {
    const d = new Date(iso);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    const t = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    if (sameDay) return t;
    return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')} ${t}`;
};

function AdminThread() {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading]   = useState(true);
    const [hasText, setHasText]   = useState(false);
    const [sending, setSending]   = useState(false);
    const [pendingImg, setPendingImg] = useState(null);  // { file, preview }
    const [lightbox, setLightbox] = useState(null);
    const endRef  = useRef(null);
    const fileRef = useRef(null);
    const inputRef = useRef(null);
    const initial = useRef(true);

    const load = useCallback(() => {
        return getMessages()
            .then(d => setMessages(d.messages || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        const t = setInterval(load, 7000);
        return () => clearInterval(t);
    }, [load]);
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: initial.current ? 'auto' : 'smooth' });
        initial.current = false;
    }, [messages]);

    const pickImage = (file) => {
        if (!file || !file.type.startsWith('image/')) return;
        setPendingImg({ file, preview: URL.createObjectURL(file) });
    };

    // Vloženie obrázka (z klávesnice "Prilepiť", Ctrl+V, alebo drag) — funguje na webe aj mobile
    const onPaste = (e) => {
        const items = e.clipboardData?.items || [];
        const imgItem = [...items].find(i => i.type.startsWith('image/'));
        if (imgItem) {
            e.preventDefault();
            pickImage(imgItem.getAsFile());
        }
    };

    const onInput = () => setHasText(!!inputRef.current?.innerText.trim());

    const clearInput = () => { if (inputRef.current) inputRef.current.innerText = ''; setHasText(false); };

    const send = async () => {
        const body = (inputRef.current?.innerText || '').trim();
        if ((!body && !pendingImg) || sending) return;
        setSending(true);
        try {
            let image_url = null;
            if (pendingImg) {
                const up = await uploadMessageImage(pendingImg.file);
                image_url = up.image_url;
            }
            const msg = await sendMessage(body, image_url);
            setMessages(m => [...m, msg]);
            clearInput();
            setPendingImg(null);
        } catch (e) { alert(e.message); }
        finally { setSending(false); }
    };

    const remove = async (id) => {
        if (!confirm('Zmazať správu?')) return;
        try {
            await deleteMessage(id);
            setMessages(m => m.map(x => x.id === id ? { ...x, deleted_at: new Date().toISOString(), body: null, image_url: null } : x));
        } catch (e) { alert(e.message); }
    };

    return (
        <>
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
                                {del ? (
                                    <div className={styles.body}>Správa zmazaná</div>
                                ) : (
                                    <>
                                        {m.image_url && (
                                            <img src={m.image_url} alt="" className={styles.msgImg}
                                                onClick={() => setLightbox(m.image_url)} />
                                        )}
                                        {m.body && <div className={styles.body}>{m.body}</div>}
                                    </>
                                )}
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
                <div
                    ref={inputRef}
                    className={styles.input}
                    contentEditable
                    role="textbox"
                    data-placeholder="Napíšte správu…"
                    onInput={onInput}
                    onPaste={onPaste}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                />
                <button className={styles.sendBtn} onClick={send} disabled={sending || (!hasText && !pendingImg)}>
                    {sending ? '…' : 'Odoslať'}
                </button>
            </div>

            {lightbox && (
                <div className={styles.lightbox} onClick={() => setLightbox(null)}>
                    <img src={lightbox} alt="" className={styles.lightboxImg} />
                </div>
            )}
        </>
    );
}

// Zalozka sa da otvorit priamo odkazom, napr. /spravy?tab=organizator.
const TABS = [
    { key: 'organizator', label: 'Oznamy', sub: 'Oznamy organizátora k súťaži a ich história' },
    { key: 'admin',       label: 'Chat s adminom', sub: 'Otázky pre admina, nahlásenie chyby vo výsledku…' },
];

export default function Messages() {
    const [params, setParams] = useSearchParams();
    const tab = TABS.some(t => t.key === params.get('tab')) ? params.get('tab') : TABS[0].key;
    const aktivna = TABS.find(t => t.key === tab);

    return (
        <div className={styles.wrap}>
            <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e8ecf0' }}>
                {TABS.map(t => (
                    <button key={t.key}
                            onClick={() => setParams(t.key === TABS[0].key ? {} : { tab: t.key })}
                            style={{ border: 'none', background: 'none', cursor: 'pointer',
                                     padding: '8px 12px', fontSize: '0.88rem',
                                     fontWeight: t.key === tab ? 700 : 400,
                                     color: t.key === tab ? '#1a3a6b' : '#888',
                                     borderBottom: `2px solid ${t.key === tab ? '#1a3a6b' : 'transparent'}`,
                                     marginBottom: -1 }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Popis sekcie stojí pod záložkami — hlavička nad nimi len opakovala
                názov aktívnej záložky a brala miesto. */}
            <div className={styles.headerSub} style={{ margin: '8px 2px 12px' }}>
                {aktivna.sub}
            </div>

            {/* Vlákno s adminom si drží vlastný stav, preto sa nechá odmontovať. */}
            {tab === 'admin' ? <AdminThread /> : (
                <div style={{ flex: 1, overflowY: 'auto', padding: '4px 2px' }}>
                    <OrganizerMessages />
                </div>
            )}
        </div>
    );
}
