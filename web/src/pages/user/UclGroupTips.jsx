import { useState } from 'react';
import { getUclGameTips } from '../../api/ucl';
import { calcLiveUclPoints } from '../../utils/tipWindow';

// Rozklik tipov spoluhráčov na zápas. Cudzie tipy sa odkryjú až po začiatku zápasu —
// server ich dovtedy vôbec nevydá.
export default function UclGroupTips({ game }) {
    const [open, setOpen] = useState(false);
    const [groups, setGroups] = useState(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');

    // Kým výsledok nie je schválený, body sa počítajú priebežne.
    const isLive = !game.result_approved
        && (game.ls_home != null || game.home_score_regular != null);

    const toggle = async () => {
        if (!open && groups === null) {
            setLoading(true); setErr('');
            try { setGroups(await getUclGameTips(game.game_id)); }
            catch (e) {
                if (e.message?.includes('začiatku')) { setGroups([]); setErr('Tipy budú viditeľné po začiatku zápasu.'); }
                else setErr(e.message);
            }
            finally { setLoading(false); }
        }
        setOpen(o => !o);
    };

    return (
        <div style={{ width: '100%' }}>
            <button onClick={toggle}
                style={{ border: 'none', background: 'none', color: '#1a3a6b', cursor: 'pointer',
                         fontSize: '0.78rem', padding: '4px 0' }}>
                {open ? '▲ Skryť tipy skupín' : '▼ Tipy skupín'}
            </button>

            {open && (
                <div style={{ marginTop: 4 }}>
                    {loading && <div style={{ fontSize: '0.8rem', color: '#888' }}>Načítavam…</div>}
                    {err && <div style={{ fontSize: '0.8rem', color: '#c0392b' }}>{err}</div>}
                    {groups && groups.length === 0 && !err &&
                        <div style={{ fontSize: '0.8rem', color: '#888' }}>Nie si v žiadnej skupine</div>}

                    {groups && groups.map(grp => (
                        <div key={grp.group_id} style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#666', marginBottom: 2 }}>
                                {grp.group_name}
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                <tbody>
                                    {grp.members.map(m => {
                                        const livePts = isLive ? calcLiveUclPoints(m.tip1, m.tip2, game) : null;
                                        const pts = m.points ?? livePts;
                                        return (
                                            <tr key={m.user_id}
                                                style={{ background: m.is_me ? '#e8eef8' : 'transparent' }}>
                                                <td style={{ padding: '3px 6px' }}>{m.username}</td>
                                                <td style={{ padding: '3px 6px', textAlign: 'center', fontWeight: 600 }}>
                                                    {m.tip1 == null
                                                        ? <span style={{ color: '#bbb' }}>—</span>
                                                        : `${m.tip1}:${m.tip2}`}
                                                </td>
                                                <td style={{ padding: '3px 6px', textAlign: 'right', width: 52,
                                                             color: livePts != null && m.points == null ? '#e67e22' : '#28a745' }}>
                                                    {pts != null ? `+${pts}b` : ''}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
