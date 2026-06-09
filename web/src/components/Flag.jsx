import { useState, useRef, useEffect, createContext, useContext } from 'react';
import { apiFetch } from '../api/client';

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

const flagUrl = (code, compId) => compId === 2
    ? `/flags/fifa_flag_${code?.toLowerCase()}.png`
    : `/flags/team_flag_${code?.toLowerCase()}.png`;

// Zdieľaný komponent vlajky s tooltipom (web: hover title, mobil: long-press bublina)
// className/imgStyle sa aplikujú na samotný <img> (kvôli existujúcim CSS triedam).
export function Flag({ code, compId, width, height, style, className, wrapStyle }) {
    const names = useTeamNames(compId);
    const fullName = names[code?.toUpperCase()] || code || '';
    const [showTip, setShowTip] = useState(false);
    const timer = useRef(null);

    const startPress = () => {
        timer.current = setTimeout(() => setShowTip(true), 450);
    };
    const endPress = () => {
        clearTimeout(timer.current);
        if (showTip) setTimeout(() => setShowTip(false), 1500);
    };
    useEffect(() => () => clearTimeout(timer.current), []);

    // Ak nie je className, použijeme inline rozmery (default 14×10)
    const imgStyle = className
        ? style
        : { width: width ?? 14, height: height ?? 10, objectFit: 'cover', verticalAlign: 'middle', ...style };

    return (
        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', ...wrapStyle }}>
            <img
                src={flagUrl(code, compId)}
                alt={code}
                title={fullName}
                className={className}
                style={imgStyle}
                onError={e => (e.target.style.display = 'none')}
                onTouchStart={startPress}
                onTouchEnd={endPress}
                onTouchCancel={endPress}
            />
            {showTip && fullName && (
                <span style={{
                    position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                    marginBottom: 4, background: '#1a3a6b', color: '#fff', fontSize: '0.72rem',
                    padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap', zIndex: 50,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.25)', pointerEvents: 'none',
                }}>
                    {fullName}
                </span>
            )}
        </span>
    );
}
