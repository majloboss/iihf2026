import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Pravidla from './user/Pravidla';

// Pravidlá bez prihlásenia — dajú sa poslať odkazom komukoľvek.
//
// Trasa stojí mimo chránenej vetvy, ktorá by neprihláseného poslala na login,
// preto má vlastnú hlavičku namiesto bočného menu. Prihlásený sa z nej vráti
// odkazom späť.
export default function PravidlaPublic() {
    const { user } = useAuth();

    return (
        <div style={{ minHeight: '100vh', background: '#f5f7fa' }}>
            <header style={{ background: '#1a3a6b', color: '#fff', padding: '14px 20px',
                             display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <img src="/logo.png" alt="" style={{ width: 34, height: 34, objectFit: 'contain' }}
                     onError={e => { e.currentTarget.style.display = 'none'; }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, lineHeight: 1.2 }}>BetClub</div>
                    <div style={{ fontSize: '0.78rem', opacity: 0.75 }}>Pravidlá tipovania</div>
                </div>
                {/* Prihláseného pustíme späť do aplikácie, ostatným ponúkneme prihlásenie. */}
                <Link to={user ? (user.role === 'admin' ? '/admin/results' : '/dashboard') : '/login'}
                      style={{ color: '#fff', fontSize: '0.85rem', textDecoration: 'none',
                               border: '1px solid rgba(255,255,255,0.4)', borderRadius: 6,
                               padding: '5px 12px', whiteSpace: 'nowrap' }}>
                    {user ? '← Späť do aplikácie' : 'Prihlásiť sa'}
                </Link>
            </header>

            <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 12px' }}>
                <Pravidla />
            </div>
        </div>
    );
}
