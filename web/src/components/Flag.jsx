import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { useCompetition } from '../context/CompetitionContext';

// ── Cache mapovania skratka→názov per competition_id ──
const cache = {};            // { [compId]: { CODE: name } }
const inflight = {};         // { [compId]: Promise }

function loadTeamNames(compId) {
    if (!compId) return Promise.resolve({});
    if (cache[compId]) return Promise.resolve(cache[compId]);
    if (inflight[compId]) return inflight[compId];
    inflight[compId] = apiFetch(`v1/team-names?competition_id=${compId}`)
        .then(map => { cache[compId] = map || {}; return cache[compId]; })
        .catch(() => ({}))
        .finally(() => { delete inflight[compId]; });
    return inflight[compId];
}

// Hook: vráti mapu názvov pre daný turnaj (raz načíta + cachne)
export function useTeamNames(compId) {
    const [names, setNames] = useState(() => cache[compId] || {});
    useEffect(() => {
        let alive = true;
        loadTeamNames(compId).then(m => { if (alive) setNames(m); });
        return () => { alive = false; };
    }, [compId]);
    return names;
}

const flagUrl = (code, compId) => {
    if (compId === 2) return `/flags/fifa_flag_${code?.toLowerCase()}.png`;
    return `/flags/team_flag_${code?.toLowerCase()}.png`;
};

// Zdieľaný komponent vlajky s názvom krajiny v `title` (web hover tooltip).
// Na mobile long-press nepoužívame — natívne menu obrázka tomu prekáža.
// className/style sa aplikujú na samotný <img> (kvôli existujúcim CSS triedam).
export function Flag({ code, compId, width, height, style, className }) {
    const names = useTeamNames(compId);
    // Flag sa môže vykresliť aj mimo CompetitionProvider — kontext je vtedy null.
    const comp = useCompetition();
    const slug = comp?.competitions?.find(c => c.id === compId)?.slug;
    const fullName = names[code?.toUpperCase()] || code || '';

    // UCL sú kluby, nie reprezentácie — vlajka k nim nepatrí. Logo sa tu kresliť
    // nedá: názov súboru je v uefa_clubs.logo_file a u väčšiny klubov nesedí s
    // kódom (GAL → galatasaray_logo.png). Kde náhodou sedel, ukázalo sa logo,
    // inde rozbitý obrázok. Kluby s logom zobrazuje komponent UclClub.
    if (slug === 'ucl2026') return null;

    const imgStyle = className
        ? style
        : { width: width ?? 14, height: height ?? 10, objectFit: 'cover', verticalAlign: 'middle', ...style };

    return (
        <img
            src={flagUrl(code, compId)}
            alt={code}
            title={fullName}
            className={className}
            style={imgStyle}
            onError={e => (e.target.style.display = 'none')}
        />
    );
}
