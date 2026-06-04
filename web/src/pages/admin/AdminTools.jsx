import { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';
import { fifaTestSetup } from '../../api/fifaAdmin';
import { getUsers, impersonate } from '../../api/admin';
import { useCompetition } from '../../context/CompetitionContext';

const BASE = import.meta.env.VITE_API_URL ?? '/api';
import styles from './Admin.module.css';

const isDev = (import.meta.env.VITE_API_URL ?? '').includes('dev_');

const GEN_ACTIONS = [
    { key: 'group', label: 'Základná skupina' },
    { key: 'qf',    label: 'Štvrťfinále' },
    { key: 'sf',    label: 'Semifinále' },
    { key: 'final', label: 'Finále + Bronz' },
];

const TABS = [
    { key: 'login',  label: 'Prihlasovanie' },
    { key: 'fifa',   label: 'FIFA 2026' },
    { key: 'iihf',   label: 'IIHF 2026' },
    { key: 'notif',  label: 'Notifikácie' },
    { key: 'common', label: 'Common' },
];

export default function AdminTools() {
    const { activeCompetition } = useCompetition();
    const [tab, setTab]               = useState(activeCompetition?.slug === 'fifa2026' ? 'fifa' : 'iihf');
    const [running,    setRunning]    = useState(null);
    const [results,    setResults]    = useState({});
    const [errors,     setErrors]     = useState({});
    const [confirm,  setConfirm]  = useState(null); // 'init' | 'reset' | null
    const [syncRes,  setSyncRes]  = useState(null);
    const [syncErr,  setSyncErr]  = useState('');
    const [syncing,  setSyncing]  = useState(false);
    const [testMailTo,  setTestMailTo]  = useState('');
    const [testMailRes, setTestMailRes] = useState('');
    const [testMailing, setTestMailing] = useState(false);
    const [pushDiag,      setPushDiag]      = useState(null);
    const [pushLoading,   setPushLoading]   = useState(false);
    const [vapidStatus,   setVapidStatus]   = useState(null); // null | 'ok' | 'missing'
    const [vapidLoading,  setVapidLoading]  = useState(false);
    const [vapidMsg,      setVapidMsg]      = useState('');
    const [subLoading,    setSubLoading]    = useState(false);
    const [subMsg,        setSubMsg]        = useState('');
    const [sendLoading,   setSendLoading]   = useState(false);
    const [sendMsg,       setSendMsg]       = useState('');
    const [fifaAction,    setFifaAction]    = useState(null);
    const [fifaConfirm,   setFifaConfirm]   = useState(null);
    const [fifaMsg,       setFifaMsg]       = useState('');
    const [userList,      setUserList]      = useState([]);
    const [selUserId,     setSelUserId]     = useState('');
    const [impBusy,       setImpBusy]       = useState(false);
    const [impMsg,        setImpMsg]        = useState('');

    useEffect(() => {
        fetch(BASE + '/v1/push-config')
            .then(r => setVapidStatus(r.ok ? 'ok' : 'missing'))
            .catch(() => setVapidStatus('missing'));
    }, []);

    // Pri prepnutí turnaja v sidebari prepni focus na jeho záložku
    useEffect(() => {
        if (activeCompetition?.slug === 'fifa2026') setTab('fifa');
        else if (activeCompetition?.slug) setTab('iihf');
    }, [activeCompetition?.slug]);

    const run = async (action) => {
        setConfirm(null);
        setRunning(action);
        setResults(p => ({ ...p, [action]: null }));
        setErrors(p => ({ ...p, [action]: '' }));
        try {
            const r = await apiFetch('v1/admin/test-setup', {
                method: 'POST',
                body: JSON.stringify({ action }),
            });
            setResults(p => ({ ...p, [action]: r }));
        } catch (e) {
            setErrors(p => ({ ...p, [action]: e.message }));
        } finally {
            setRunning(null);
        }
    };

    const busy = running !== null || syncing;

    const sendTestMail = async () => {
        setTestMailing(true); setTestMailRes('');
        try {
            await apiFetch('v1/admin/test-mail', { method: 'POST', body: JSON.stringify({ to: testMailTo }) });
            setTestMailRes('✓ Email odoslaný na ' + testMailTo);
        } catch (e) { setTestMailRes('✗ ' + e.message); }
        finally { setTestMailing(false); }
    };

    const testPush = async () => {
        setPushLoading(true); setPushDiag(null);
        const browser = {
            notification_api: 'Notification' in window,
            push_manager:     'PushManager' in window,
            service_worker:   'serviceWorker' in navigator,
            permission:       'Notification' in window ? Notification.permission : 'unsupported',
        };
        try {
            const server = await apiFetch('v1/admin/test-push', { method: 'POST' });
            setPushDiag({ browser, server });
        } catch (e) {
            setPushDiag({ browser, error: e.message });
        } finally {
            setPushLoading(false);
        }
    };

    const generateVapid = async () => {
        setVapidLoading(true); setVapidMsg('');
        try {
            const r = await apiFetch('v1/admin/generate-vapid', { method: 'POST' });
            setVapidMsg('✓ VAPID kľúče vygenerované. Public key: ' + r.public_key.slice(0, 20) + '…');
            setVapidStatus('ok');
            setPushDiag(null);
        } catch (e) { setVapidMsg('✗ ' + e.message); }
        finally { setVapidLoading(false); }
    };

    const subscribeBrowser = async () => {
        setSubLoading(true); setSubMsg('');
        try {
            if (!('PushManager' in window)) throw new Error('Tento browser nepodporuje Web Push');
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') throw new Error('Notifikácie zamietnuté (' + perm + ')');

            const cfgRes = await fetch((import.meta.env.VITE_API_URL ?? '/api') + '/v1/push-config');
            const cfg = await cfgRes.json();
            if (!cfg.ok) throw new Error('VAPID public key nie je na serveri');

            const vapidKey = cfg.data.public_key;
            const keyBytes = Uint8Array.from(atob(vapidKey.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));

            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes });

            await apiFetch('v1/push-subscribe', { method: 'POST', body: JSON.stringify({ subscription: sub.toJSON() }) });
            setSubMsg('✓ Browser prihlásený na push notifikácie.');
            setPushDiag(null);
        } catch (e) { setSubMsg('✗ ' + e.message); }
        finally { setSubLoading(false); }
    };

    const unsubscribeBrowser = async () => {
        setSubLoading(true); setSubMsg('');
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            const endpoint = sub?.endpoint ?? null;
            if (sub) await sub.unsubscribe();
            await apiFetch('v1/push-subscribe', { method: 'DELETE', body: JSON.stringify({ endpoint }) });
            setSubMsg('✓ Subscription zrušená.');
            setPushDiag(null);
        } catch (e) { setSubMsg('✗ ' + e.message); }
        finally { setSubLoading(false); }
    };

    const sendTestPush = async () => {
        setSendLoading(true); setSendMsg('');
        try {
            await apiFetch('v1/admin/send-test-push', { method: 'POST' });
            setSendMsg('✓ Push odoslaný — mal by sa zobraziť do pár sekúnd.');
        } catch (e) { setSendMsg('✗ ' + e.message); }
        finally { setSendLoading(false); }
    };

    useEffect(() => {
        if (tab === 'login' && userList.length === 0) {
            getUsers().then(setUserList).catch(() => {});
        }
    }, [tab]);

    const doImpersonate = async () => {
        if (!selUserId) return;
        setImpBusy(true); setImpMsg('');
        try {
            const r = await impersonate(parseInt(selUserId));
            window.open('/impersonate#' + r.token, '_blank');
            setImpMsg('✓ Otvorené nové okno ako ' + r.username);
        } catch (e) { setImpMsg('✗ ' + e.message); }
        finally { setImpBusy(false); }
    };

    const runFifa = async (action) => {
        setFifaConfirm(null); setFifaAction(action); setFifaMsg('');
        try {
            const r = await fifaTestSetup(action);
            if (action === 'load_master')      setFifaMsg(`✓ Rozpis načítaný z master: ${r.games_loaded} zápasov`);
            else if (action === 'reset')       setFifaMsg(`✓ Súťaž spustená: ${r.games_reset} zápasov obnovených, tipy a tabuľky vymazané`);
            else if (action === 'gen_group')   setFifaMsg(`✓ Základná časť: ${r.games} zápasov, ${r.users} hráčov, ${r.tips} tipov`);
        } catch (e) { setFifaMsg('✗ ' + e.message); }
        finally { setFifaAction(null); }
    };

    const syncScores = async () => {
        setSyncing(true); setSyncRes(null); setSyncErr('');
        try {
            const r = await apiFetch('v1/admin/sync-scores', { method: 'POST' });
            setSyncRes(r);
        } catch (e) { setSyncErr(e.message); }
        finally { setSyncing(false); }
    };

    return (
        <div className={styles.toolsWrap}>
            <h2>Nástroje</h2>

            {/* ── Záložky ─────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '16px 0 4px', borderBottom: '2px solid #e9ecef' }}>
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        style={{
                            padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer',
                            fontSize: '0.9rem', fontWeight: 600, marginBottom: -2,
                            borderBottom: '2px solid ' + (tab === t.key ? '#1a3a6b' : 'transparent'),
                            color: tab === t.key ? '#1a3a6b' : '#999',
                        }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ════════ PRIHLASOVANIE (impersonácia) ════════ */}
            {tab === 'login' && (
                <div className={styles.card} style={{ padding: 20, marginTop: 16, borderLeft: '4px solid #6f42c1' }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#6f42c1' }}>🔓 Prihlásiť sa ako iný používateľ</h3>
                    <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#666' }}>
                        Vyber používateľa a klikni Login — aplikácia sa otvorí v novom okne prihlásená ako on.
                        Tvoje admin prihlásenie v tomto okne ostáva nedotknuté.
                    </p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <select value={selUserId} onChange={e => setSelUserId(e.target.value)}
                            style={{ padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: '0.88rem', flex: 1, minWidth: 220 }}>
                            <option value="">— vyber používateľa —</option>
                            {userList.filter(u => u.is_active)
                                .slice().sort((a, b) => a.username.localeCompare(b.username, 'sk'))
                                .map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.username}{(u.first_name || u.last_name) ? ` (${[u.first_name, u.last_name].filter(Boolean).join(' ')})` : ''}{u.role === 'admin' ? ' · admin' : ''}
                                </option>
                            ))}
                        </select>
                        <button className={styles.btn} style={{ background: '#6f42c1' }} onClick={doImpersonate} disabled={impBusy || !selUserId}>
                            {impBusy ? '…' : '🔓 Login'}
                        </button>
                    </div>
                    {impMsg && <p style={{ marginTop: 8, fontSize: '0.85rem', color: impMsg.startsWith('✓') ? '#28a745' : '#dc3545' }}>{impMsg}</p>}
                </div>
            )}

            {/* ════════ COMMON ════════ */}
            {tab === 'common' && <>
            {/* ── Sync výsledkov z API-Sports ─────────────────────────── */}
            <div className={styles.card} style={{ padding: 20, marginTop: 16, borderLeft: '4px solid #1a3a6b' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#1a3a6b' }}>🌐 Sync výsledkov (API-Sports)</h3>
                <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#666' }}>
                    Stiahne dnešné výsledky z API-Sports a aktualizuje skóre + stav zápasov.
                    Dostupné od 15.5.2026 keď turnaj začne.
                </p>
                <button className={styles.btn} onClick={syncScores} disabled={busy}>
                    {syncing ? 'Sťahujem…' : '↓ Sync výsledkov'}
                </button>
                {syncErr && <p style={{ color: '#dc3545', marginTop: 8, fontSize: '0.85rem' }}>{syncErr}</p>}
                {syncRes && (
                    <div style={{ background: '#f0f5ff', border: '1px solid #1a3a6b', borderRadius: 6, padding: '8px 12px', fontSize: '0.85rem', marginTop: 8 }}>
                        <div>📅 Dátum: <strong>{syncRes.date}</strong> | Stiahnutých: <strong>{syncRes.fetched}</strong> | Aktualizovaných: <strong>{syncRes.updated}</strong></div>
                        {syncRes.log?.map((l, i) => <div key={i} style={{ marginLeft: 8, marginTop: 2 }}>{l}</div>)}
                    </div>
                )}
            </div>

            </>}

            {/* ════════ NOTIFIKÁCIE ════════ */}
            {tab === 'notif' && <>
            {/* ── Test emailu ────────────────────────────────────────── */}
            <div className={styles.card} style={{ padding: 20, marginTop: 16, borderLeft: '4px solid #6f42c1' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#6f42c1' }}>📧 Test emailu (SMTP)</h3>
                <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#666' }}>
                    Pošle testovací email na zadanú adresu — overí že SMTP funguje.
                </p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        type="email"
                        placeholder="email@example.com"
                        value={testMailTo}
                        onChange={e => setTestMailTo(e.target.value)}
                        style={{ padding: '7px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: '0.88rem', flex: 1, minWidth: 200 }}
                    />
                    <button className={styles.btn} onClick={sendTestMail} disabled={testMailing || !testMailTo}>
                        {testMailing ? 'Odosielam…' : '📤 Odoslať test'}
                    </button>
                </div>
                {testMailRes && (
                    <p style={{ marginTop: 8, fontSize: '0.85rem', color: testMailRes.startsWith('✓') ? '#28a745' : '#dc3545' }}>
                        {testMailRes}
                    </p>
                )}
            </div>

            {/* ── VAPID kľúče (vždy viditeľné) ──────────────────────── */}
            <div className={styles.card} style={{ padding: 20, marginTop: 16, borderLeft: '4px solid #20c997' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#20c997' }}>🔑 VAPID kľúče (Push notifikácie)</h3>
                <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#666' }}>
                    Jednorazové generovanie VAPID kľúčov na serveri. Potrebné pre odosielanie push notifikácií.
                </p>
                {vapidStatus === null && <p style={{ fontSize: '0.85rem', color: '#999' }}>Kontrolujem…</p>}
                {vapidStatus === 'ok' && (
                    <p style={{ fontSize: '0.85rem', color: '#28a745', margin: '0 0 8px' }}>✓ VAPID kľúče sú nakonfigurované</p>
                )}
                {vapidStatus === 'missing' && (
                    <p style={{ fontSize: '0.85rem', color: '#dc3545', margin: '0 0 8px' }}>✗ VAPID kľúče chýbajú — push notifikácie nebudú fungovať</p>
                )}
                <button className={styles.btn} style={{ background: '#20c997' }} onClick={generateVapid} disabled={vapidLoading}>
                    {vapidLoading ? 'Generujem…' : vapidStatus === 'ok' ? '🔄 Regenerovať VAPID kľúče' : '🔑 Generovať VAPID kľúče'}
                </button>
                {vapidMsg && <p style={{ marginTop: 8, fontSize: '0.85rem', color: vapidMsg.startsWith('✓') ? '#28a745' : '#dc3545' }}>{vapidMsg}</p>}
            </div>

            {/* ── Test Push notifikácií (len develop) ────────────────── */}
            {isDev && (
                <div className={styles.card} style={{ padding: 20, marginTop: 16, borderLeft: '4px solid #20c997' }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#20c997' }}>🔔 Test Push notifikácií</h3>
                    <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#666' }}>
                        Diagnostika servera a browsera pre Web Push (VAPID). Len v develop prostredí.
                    </p>
                    <button className={styles.btn} style={{ background: '#20c997' }} onClick={testPush} disabled={pushLoading}>
                        {pushLoading ? 'Kontrolujem…' : '🔔 Spustiť diagnostiku'}
                    </button>
                    {pushDiag && <PushDiagBlock diag={pushDiag} />}

                    {/* Krok 2: prihlásiť browser */}
                    {pushDiag?.server?.vapid_config === 'ok' && (
                        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            <button className={styles.btn} style={{ background: '#0d6efd' }} onClick={subscribeBrowser} disabled={subLoading}>
                                {subLoading ? 'Prihlasujem…' : '📲 Prihlásiť tento browser'}
                            </button>
                            {(pushDiag?.server?.subscribed_users ?? 0) > 0 && (
                                <button className={styles.btn} style={{ background: '#6c757d' }} onClick={unsubscribeBrowser} disabled={subLoading}>
                                    {subLoading ? '…' : '🚫 Odhlásiť'}
                                </button>
                            )}
                        </div>
                    )}
                    {subMsg && <p style={{ marginTop: 8, fontSize: '0.85rem', color: subMsg.startsWith('✓') ? '#28a745' : '#dc3545' }}>{subMsg}</p>}

                    {/* Krok 3: poslať test push */}
                    {(pushDiag?.server?.subscribed_users ?? 0) > 0 && pushDiag?.server?.vapid_config === 'ok' && (
                        <div style={{ marginTop: 12 }}>
                            <button className={styles.btn} style={{ background: '#20c997' }} onClick={sendTestPush} disabled={sendLoading}>
                                {sendLoading ? 'Odosielam…' : '📤 Poslať test push'}
                            </button>
                        </div>
                    )}
                    {sendMsg && <p style={{ marginTop: 8, fontSize: '0.85rem', color: sendMsg.startsWith('✓') ? '#28a745' : '#dc3545' }}>{sendMsg}</p>}
                </div>
            )}

            </>}

            {/* ════════ FIFA 2026 ════════ */}
            {tab === 'fifa' && <>
                {/* Generovanie základnej časti */}
                <div className={styles.card} style={{ padding: 20, marginTop: 16 }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1rem' }}>⚽ Vygenerovať základnú časť</h3>
                    <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#666' }}>
                        Posunie dátumy tak, aby skupinová fáza skončila <strong>včera</strong> a play-off začalo <strong>dnes</strong>.
                        Odohrá všetky skupinové zápasy (podľa ratingu) a vygeneruje tipy hráčov.
                    </p>
                    {fifaConfirm === 'gen_group'
                        ? <ConfirmInline text="Vygenerovať skupinovú fázu a tipy? Prepíše existujúce skóre a tipy skupín."
                            onYes={() => runFifa('gen_group')} onNo={() => setFifaConfirm(null)} />
                        : <button className={styles.btn} onClick={() => setFifaConfirm('gen_group')} disabled={!!fifaAction}>
                            {fifaAction === 'gen_group' ? 'Generujem…' : '⚽ Vygenerovať základnú časť'}
                          </button>}
                </div>

                {/* Načítať master */}
                <div className={styles.card} style={{ padding: 20, marginTop: 12, borderLeft: '4px solid #0891b2' }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#0891b2' }}>📥 Načítať rozpis z master</h3>
                    <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#666' }}>
                        Obnoví rozpis zápasov z <code>games_pdf</code> (tímy, časy, štadióny, FlashScore).
                        Skóre sa vynuluje, <strong>tipy ostávajú</strong>.
                    </p>
                    {fifaConfirm === 'load_master'
                        ? <ConfirmInline text="Obnoviť rozpis z master? Existujúce skóre sa vynuluje."
                            onYes={() => runFifa('load_master')} onNo={() => setFifaConfirm(null)} />
                        : <button className={styles.btn} style={{ background: '#0891b2' }} onClick={() => setFifaConfirm('load_master')} disabled={!!fifaAction}>
                            {fifaAction === 'load_master' ? 'Načítavam…' : '📥 Načítať master'}
                          </button>}
                </div>

                {/* Spustenie súťaže */}
                <div className={styles.card} style={{ padding: 20, marginTop: 12, borderLeft: '4px solid #28a745' }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#28a745' }}>▶ Spustenie súťaže</h3>
                    <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#666' }}>
                        Obnoví rozpis z master a <strong>vymaže všetky tipy a tabuľky</strong>.
                        Useri, skupiny a pozvánky zostávajú. <strong>Nezvratné!</strong>
                    </p>
                    {fifaConfirm === 'reset'
                        ? <ConfirmInline text="Naozaj spustiť súťaž a vymazať tipy + tabuľky?"
                            onYes={() => runFifa('reset')} onNo={() => setFifaConfirm(null)} />
                        : <button className={styles.btn} style={{ background: '#28a745' }} onClick={() => setFifaConfirm('reset')} disabled={!!fifaAction}>
                            {fifaAction === 'reset' ? 'Prebieha…' : '▶ Spustiť súťaž'}
                          </button>}
                </div>

                {fifaMsg && <p style={{ marginTop: 12, fontSize: '0.88rem', color: fifaMsg.startsWith('✓') ? '#28a745' : '#dc3545' }}>{fifaMsg}</p>}
            </>}

            {/* ════════ IIHF 2026 ════════ */}
            {tab === 'iihf' && <>
            {/* ── Generovanie testovacích dát ─────────────────────────── */}
            <div className={styles.card} style={{ padding: 20, marginTop: 16 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1rem' }}>Generovanie testovacích dát</h3>
                <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#666' }}>
                    Každé tlačidlo generuje dáta pre danú fázu. Poradie: Základná skupina → QF → SF → Finále.
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {GEN_ACTIONS.map(({ key, label }) => (
                        <button key={key} className={styles.btn}
                            onClick={() => run(key)}
                            disabled={busy}>
                            {running === key ? 'Prebieha…' : '▶ ' + label}
                        </button>
                    ))}
                </div>
                <ResultArea keys={GEN_ACTIONS.map(a => a.key)} results={results} errors={errors} />
            </div>

            {/* ── Načítanie zápasov z games_pdf ──────────────────────── */}
            <div className={styles.card} style={{ padding: 20, marginTop: 12, borderLeft: '4px solid #0891b2' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#0891b2' }}>📄 Načítať zápasy z PDF</h3>
                <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#666' }}>
                    Obnoví rozvrh všetkých 64 zápasov z tabuľky <code>games_pdf</code> (tímy, časy, miesta, FlashScore).
                    Tipy, useri ani skupiny sa <strong>nemažú</strong>.
                </p>
                {confirm === 'load_pdf'
                    ? <ConfirmInline
                        text="Prepísať rozvrh zápasov z games_pdf? Existujúce skóre sa vynuluje."
                        onYes={() => run('load_pdf')}
                        onNo={() => setConfirm(null)}
                      />
                    : <button
                        className={styles.btn}
                        style={{ background: '#0891b2' }}
                        onClick={() => setConfirm('load_pdf')}
                        disabled={busy}>
                        {running === 'load_pdf' ? 'Načítavam…' : '📄 Načítať z PDF'}
                      </button>
                }
                <ResultArea keys={['load_pdf']} results={results} errors={errors} />
            </div>

            {/* ── Spustenie súťaže ────────────────────────────────────── */}
            <div className={styles.card} style={{ padding: 20, marginTop: 12, borderLeft: '4px solid #28a745' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#28a745' }}>▶ Spustenie súťaže</h3>
                <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#666' }}>
                    Vymaže <strong>tipy a tabuľky</strong>, obnoví pôvodný rozvrh zápasov z PDF.
                    Useri, skupiny a pozývacie linky zostávajú. <strong>Nezvratné!</strong>
                </p>
                {confirm === 'reset'
                    ? <ConfirmInline
                        text="Naozaj obnoviť pôvodný rozvrh a vymazať tipy?"
                        onYes={() => run('reset')}
                        onNo={() => setConfirm(null)}
                      />
                    : <button
                        className={styles.btn}
                        style={{ background: '#28a745' }}
                        onClick={() => setConfirm('reset')}
                        disabled={busy}>
                        {running === 'reset' ? 'Prebieha…' : '▶ Spustiť súťaž'}
                      </button>
                }
                <ResultArea keys={['reset']} results={results} errors={errors} />
            </div>

            </>}

            {/* ════════ COMMON (Inicializácia) ════════ */}
            {tab === 'common' && <>
            {/* ── Inicializácia systému ───────────────────────────────── */}
            <div className={styles.card} style={{ padding: 20, marginTop: 12, borderLeft: '4px solid #dc3545' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#dc3545' }}>⚠ Inicializácia systému</h3>
                <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#666' }}>
                    Vymaže <strong>všetkých userov, tipy, pozývacie linky, skupiny a tabuľky</strong>.
                    Zápasy zostanú. Admini zostávajú. <strong>Nezvratné!</strong>
                </p>
                {confirm === 'init'
                    ? <ConfirmInline
                        text="Naozaj vymazať VŠETKÝCH userov a všetky dáta?"
                        onYes={() => run('init')}
                        onNo={() => setConfirm(null)}
                      />
                    : <button
                        className={styles.btnSmallDanger}
                        style={{ fontSize: '0.9rem', padding: '8px 16px' }}
                        onClick={() => setConfirm('init')}
                        disabled={busy}>
                        {running === 'init' ? 'Prebieha…' : '⚠ Inicializovať systém'}
                      </button>
                }
                <ResultArea keys={['init']} results={results} errors={errors} />
            </div>
            </>}
        </div>
    );
}

function ConfirmInline({ text, onYes, onNo }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 6, padding: '8px 12px' }}>
            <span style={{ fontSize: '0.88rem', flex: 1 }}>{text}</span>
            <button onClick={onYes} style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: 5, padding: '5px 14px', cursor: 'pointer', fontWeight: 600 }}>Áno</button>
            <button onClick={onNo}  style={{ background: '#6c757d', color: '#fff', border: 'none', borderRadius: 5, padding: '5px 14px', cursor: 'pointer' }}>Nie</button>
        </div>
    );
}

function ResultArea({ keys, results, errors }) {
    const items = keys.flatMap(key => {
        const out = [];
        if (errors[key])  out.push({ key, type: 'error', content: errors[key] });
        if (results[key]) out.push({ key, type: 'result', content: results[key] });
        return out;
    });
    if (items.length === 0) return null;
    return (
        <div style={{ marginTop: 14 }}>
            {items.map(({ key, type, content }) =>
                type === 'error'
                    ? <p key={key} style={{ color: '#dc3545', margin: '6px 0', fontSize: '0.85rem' }}>[{key}] {content}</p>
                    : <div key={key} style={{ background: '#f0fff4', border: '1px solid #28a745', borderRadius: 6, padding: '8px 12px', fontSize: '0.85rem', marginBottom: 6 }}>
                        <ResultBlock r={content} />
                      </div>
            )}
        </div>
    );
}

function PushDiagBlock({ diag }) {
    const { browser, server, error } = diag;
    const ok  = v => <span style={{ color: '#28a745', fontWeight: 600 }}>✓ {v}</span>;
    const bad = v => <span style={{ color: '#dc3545', fontWeight: 600 }}>✗ {v}</span>;
    const chk = (val, label) => <div style={{ margin: '2px 0' }}>{val === 'ok' ? ok(label) : bad(label + ' (' + val + ')')}</div>;

    return (
        <div style={{ marginTop: 12, fontSize: '0.84rem', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ background: '#f0fff4', border: '1px solid #20c997', borderRadius: 6, padding: '10px 14px', flex: 1, minWidth: 200 }}>
                <strong style={{ display: 'block', marginBottom: 6 }}>Browser</strong>
                {chk(browser.notification_api ? 'ok' : 'missing', 'Notification API')}
                {chk(browser.push_manager     ? 'ok' : 'missing', 'PushManager')}
                {chk(browser.service_worker   ? 'ok' : 'missing', 'Service Worker')}
                <div style={{ margin: '2px 0' }}>
                    Povolenie: {browser.permission === 'granted' ? ok('granted') : bad(browser.permission)}
                </div>
            </div>
            <div style={{ background: '#f0fff4', border: '1px solid #20c997', borderRadius: 6, padding: '10px 14px', flex: 1, minWidth: 200 }}>
                <strong style={{ display: 'block', marginBottom: 6 }}>Server (PHP {server?.php_version})</strong>
                {error && <div style={{ color: '#dc3545' }}>✗ {error}</div>}
                {server && <>
                    {chk(server.openssl_ec,       'OpenSSL EC (VAPID)')}
                    {chk(server.curl,             'cURL')}
                    {chk(server.mbstring,         'mbstring')}
                    {chk(server.vapid_config,     'vapid.php config')}
                    {chk(server.vapid_public_key, 'VAPID public key')}
                    {chk(server.vapid_private_key,'VAPID private key')}
                    <div style={{ margin: '4px 0 0' }}>
                        Subscriptions v DB: <strong>{server.subscribed_users}</strong>
                    </div>
                </>}
            </div>
        </div>
    );
}

function ResultBlock({ r }) {
    if (r.action === 'group') return <>
        <div>✓ Zápasy: <strong>{r.games}</strong>, Hráči: <strong>{r.users}</strong>, Tipy: <strong>{r.tips}</strong></div>
    </>;
    if (r.action === 'init') return <>
        <div>✓ Userov vymazaných: <strong>{r.users_deleted}</strong></div>
        <div>✓ Linkov vymazaných: <strong>{r.links_deleted}</strong></div>
    </>;
    if (r.action === 'load_pdf') return <>
        <div>✓ Zápasov načítaných z PDF: <strong>{r.games_loaded}</strong></div>
    </>;
    if (r.action === 'reset') return <>
        <div>✓ Zápasov obnovených: <strong>{r.games_reset}</strong></div>
    </>;
    if (r.games) return <>
        <div>✓ Tipy pre hráčov: <strong>{r.users}</strong></div>
        {r.games.map((s, i) => <div key={i} style={{ marginLeft: 8 }}>• {s}</div>)}
    </>;
    return <div>✓ Hotovo</div>;
}
