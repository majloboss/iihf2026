import { useEffect, useState } from 'react';
import { getUsers } from '../../api/users';
import styles from './Members.module.css';

function Avatar({ src, name, size = 48 }) {
    const initials = name?.trim().slice(0, 1).toUpperCase() || '?';
    return src
        ? <img className={styles.avatar} src={src} alt={name} style={{ width: size, height: size }} />
        : <div className={styles.avatarFallback} style={{ width: size, height: size, fontSize: size * 0.4 }}>{initials}</div>;
}

export default function Members() {
    const [users, setUsers]       = useState([]);
    const [loading, setLoading]   = useState(true);
    const [selected, setSelected] = useState(null);
    const [search, setSearch]     = useState('');

    useEffect(() => { getUsers().then(setUsers).finally(() => setLoading(false)); }, []);

    const filtered = users.filter(u => {
        const q = search.toLowerCase();
        return (
            u.username.toLowerCase().includes(q) ||
            (u.first_name || '').toLowerCase().includes(q) ||
            (u.last_name  || '').toLowerCase().includes(q)
        );
    });

    const displayName = (u) =>
        (u.first_name || u.last_name)
            ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
            : u.username;

    if (loading) return <div className={styles.wrap}><p>Načítavam…</p></div>;

    return (
        <div className={styles.wrap}>
            <div className={styles.topBar}>
                <h2>Hráči ({users.length})</h2>
                <input
                    className={styles.search}
                    placeholder="Hľadať..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            <div className={styles.grid}>
                {filtered.map(u => (
                    <button key={u.id} className={styles.card} onClick={() => setSelected(u)}>
                        <Avatar src={u.avatar} name={displayName(u)} size={56} />
                        <div className={styles.cardName}>{displayName(u)}</div>
                        <div className={styles.cardUsername}>@{u.username}</div>
                    </button>
                ))}
                {filtered.length === 0 && <p className={styles.empty}>Žiadni hráči nevyhovujú hľadaniu.</p>}
            </div>

            {selected && (
                <div className={styles.overlay} onClick={() => setSelected(null)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <button className={styles.close} onClick={() => setSelected(null)}>✕</button>
                        <Avatar src={selected.avatar} name={displayName(selected)} size={88} />
                        <h3 className={styles.modalName}>{displayName(selected)}</h3>
                        <p className={styles.modalUsername}>@{selected.username}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
