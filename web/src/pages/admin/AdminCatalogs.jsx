import { useState } from 'react';
import UclCountryCatalog from './UclCountryCatalog';
import styles from './Admin.module.css';

export default function AdminCatalogs() {
    const [tab, setTab] = useState('countries');

    return (
        <div className={styles.toolsWrap}>
            <h2>Číselníky</h2>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '16px 0 4px', borderBottom: '2px solid #e9ecef' }}>
                <button onClick={() => setTab('countries')}
                    style={{ padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, marginBottom: -2, borderBottom: '2px solid ' + (tab === 'countries' ? '#1a3a6b' : 'transparent'), color: tab === 'countries' ? '#1a3a6b' : '#999' }}>
                    Štáty
                </button>
            </div>
            {tab === 'countries' && <UclCountryCatalog />}
        </div>
    );
}
