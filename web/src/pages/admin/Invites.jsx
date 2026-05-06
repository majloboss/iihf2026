import { useEffect, useState } from 'react';
import { getInvites, createInvite } from '../../api/admin';
import styles from './Admin.module.css';

export default function Invites() {
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGen]  = useState(false);
    const [newLink, setNewLink] = useState('');
    const [error, setError]     = useState('');

    const load = () => getInvites().then(setInvites).catch(e => setError(e.message)).finally(() => setLoading(false));

    useEffect(() => { load(); }, []);

    const generate = async () => {
        setGen(true); setNewLink(''); setError('');
        try {
            const data = await createInvite();
            setNewLink(data.link);
            load();
        } catch (err) {
            setError(err.message);
        } finally {
            setGen(false);
        }
    };

    const copy = () => { navigator.clipboard.writeText(newLink); };

    return (
        <div>
            <div className={styles.header}>
                <h2>Pozývací linky</h2>
                <button className={styles.btn} onClick={generate} disabled={generating}>
                    {generating ? 'Generujem…' : '+ Nový link'}
                </button>
            </div>

            {newLink && (
                <div className={styles.newLink}>
                    <span>Nový link:</span>
                    <code>{newLink}</code>
                    <button onClick={copy} className={styles.btnSmall}>Kopírovať</button>
                </div>
            )}
            {error && <p className={styles.error}>{error}</p>}

            {loading ? <p>Načítavam…</p> : (
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Token</th>
                            <th>Vytvorený</th>
                            <th>Použitý</th>
                            <th>Hráč</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invites.map(i => (
                            <tr key={i.id}>
                                <td>{i.id}</td>
                                <td><code className={styles.token}>{i.invite_token}</code></td>
                                <td>{new Date(i.created_at).toLocaleString('sk-SK')}</td>
                                <td>{i.used_at ? new Date(i.used_at).toLocaleString('sk-SK') : <span className={styles.unused}>Nepoužitý</span>}</td>
                                <td>{i.used_by_username || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
