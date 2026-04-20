// ============================================================
// SWAN · HUB — Page Profil
// Infos perso · Sécurité · Thème · Voix · Plan · Données
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Shield, Palette, Volume2, CreditCard, Download, Briefcase, Phone, Save,
  LogOut, ChevronRight, Crown, Star, Check, X, Eye, EyeOff,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';
import { useVoice } from '@/hooks/useVoice';
import { THEMES } from '@/config/tokens';
import { toast } from 'sonner';

type Section = 'main' | 'account' | 'security' | 'theme' | 'voice' | 'plan' | 'data';

export default function Profile() {
  const navigate = useNavigate();
  const { profile, user, signOut, updateProfile, setAntiPhishingCode } = useAuth();
  const { theme, setTheme } = useTheme();
  const { settings: voiceSettings, updateSettings: updateVoice, speak } = useVoice();

  const [section, setSection] = useState<Section>('main');
  const [editingPhishing, setEditingPhishing] = useState(false);
  const [newPhishingCode, setNewPhishingCode] = useState('');
  const [showPhishing, setShowPhishing] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [accountPhone, setAccountPhone] = useState('');
  const [accountTrade, setAccountTrade] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setAccountName(profile.full_name || '');
    setAccountPhone(profile.phone || '');
    setAccountTrade(profile.trade || '');
  }, [profile]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleUpdatePhishing = async () => {
    const { error } = await setAntiPhishingCode(newPhishingCode);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Code anti-phishing mis à jour');
    setEditingPhishing(false);
    setNewPhishingCode('');
  };

  const handleUpdateAccount = async () => {
    setSavingAccount(true);
    const { error } = await updateProfile({
      full_name: accountName.trim() || null,
      phone: accountPhone.trim() || null,
      trade: accountTrade || null,
    });
    setSavingAccount(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Profil mis à jour');
    setSection('main');
  };

  if (!profile) return null;

  const isVip = profile.is_vip;
  const isBeta = profile.is_beta;

  // ════════════════════════════════════════════════════════
  // VUE PRINCIPALE
  // ════════════════════════════════════════════════════════

  if (section === 'main') {
    return (
      <div className="fade-in" style={{ paddingBottom: 'var(--space-8)' }}>
        <header className="page-header">
          <div>
            <h1 className="page-header-title">Profil</h1>
            <p className="page-header-subtitle">Gérez votre compte et vos préférences</p>
          </div>
        </header>

        {/* ── Carte utilisateur ── */}
        <div className="px-4" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="card" style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 'var(--radius-full)',
                background: 'var(--gradient-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-3)',
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-2xl)',
                fontWeight: 800,
                color: 'var(--color-primary-text)',
                position: 'relative',
              }}
            >
              {getInitials(profile.full_name)}
              {isVip && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: -4,
                    right: -4,
                    background: 'var(--color-bg)',
                    borderRadius: 'var(--radius-full)',
                    padding: 4,
                  }}
                >
                  <Crown size={16} style={{ color: 'var(--color-primary)' }} />
                </div>
              )}
            </div>
            <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 2 }}>
              {profile.full_name || 'Utilisateur'}
            </h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
              {profile.email || user?.email}
            </p>

            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
              {isVip && (
                <span className="badge badge-vip">
                  <Crown size={10} /> VIP
                </span>
              )}
              {isBeta && (
                <span className="badge badge-info">
                  <Star size={10} /> Bêta testeur
                </span>
              )}
              <span className="badge badge-gold">
                {profile.plan === 'free'  ? 'Découverte' : profile.plan === 'pro' ? 'Pro Total' : 'À la carte'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Sections ── */}
        <div className="px-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <MenuItem
            icon={<User size={20} />}
            title="Informations personnelles"
            subtitle="Nom, téléphone, métier"
            onClick={() => setSection('account')}
          />
          <MenuItem
            icon={<Shield size={20} />}
            title="Sécurité & anti-phishing"
            subtitle="Code personnel, MFA, sessions"
            onClick={() => setSection('security')}
          />
          <MenuItem
            icon={<Palette size={20} />}
            title="Apparence"
            subtitle={`Thème actuel : ${THEMES.find(t => t.id === theme)?.label}`}
            onClick={() => setSection('theme')}
          />
          <MenuItem
            icon={<Volume2 size={20} />}
            title="Assistance vocale"
            subtitle={voiceSettings.enabled ? `Voix ${voiceSettings.gender === 'female' ? 'féminine' : 'masculine'} · ${voiceSettings.speed}x` : 'Désactivée'}
            onClick={() => setSection('voice')}
          />
          <MenuItem
            icon={<CreditCard size={20} />}
            title="Plan & facturation"
            subtitle={`Plan : ${profile.plan}`}
            onClick={() => navigate('/pricing')}
          />
          <MenuItem
            icon={<Download size={20} />}
            title="Mes données"
            subtitle="Export, suppression, RGPD"
            onClick={() => setSection('data')}
          />
        </div>

        {/* ── Déconnexion ── */}
        <div className="px-4" style={{ marginTop: 'var(--space-8)' }}>
          <button
            onClick={handleSignOut}
            className="btn btn-secondary btn-full"
            style={{ color: 'var(--color-danger)' }}
          >
            <LogOut size={18} />
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // SECTION INFORMATIONS PERSONNELLES
  // ════════════════════════════════════════════════════════

  if (section === 'account') {
    return (
      <div className="fade-in" style={{ paddingBottom: 'var(--space-8)' }}>
        <SectionHeader title="Informations personnelles" onBack={() => setSection('main')} />

        <div className="px-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)', lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
              Ces infos servent à personnaliser vos outils et à préparer les prochains exports pro.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <label>
                <span className="field-label">
                  <User size={16} /> Nom affiché
                </span>
                <input
                  className="input"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Votre nom ou entreprise"
                />
              </label>

              <label>
                <span className="field-label">
                  <Phone size={16} /> Téléphone
                </span>
                <input
                  className="input"
                  value={accountPhone}
                  onChange={(e) => setAccountPhone(e.target.value)}
                  placeholder="06 00 00 00 00"
                  type="tel"
                />
              </label>

              <label>
                <span className="field-label">
                  <Briefcase size={16} /> Métier principal
                </span>
                <select
                  className="input"
                  value={accountTrade}
                  onChange={(e) => setAccountTrade(e.target.value)}
                >
                  <option value="">Non renseigné</option>
                  <option value="btp">Artisan / BTP</option>
                  <option value="services">Services</option>
                  <option value="commercial">Commercial</option>
                  <option value="immobilier">Immobilier</option>
                  <option value="transport">Transport / logistique</option>
                  <option value="freelance">Indépendant / freelance</option>
                  <option value="sante">Santé / accompagnement</option>
                  <option value="autre">Autre activité</option>
                </select>
              </label>
            </div>
          </div>

          <button
            onClick={handleUpdateAccount}
            disabled={savingAccount}
            className="btn btn-primary btn-full btn-lg"
          >
            <Save size={18} />
            {savingAccount ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // SECTION SÉCURITÉ
  // ════════════════════════════════════════════════════════

  if (section === 'security') {
    return (
      <div className="fade-in" style={{ paddingBottom: 'var(--space-8)' }}>
        <SectionHeader title="Sécurité" onBack={() => setSection('main')} />

        <div className="px-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Code anti-phishing */}
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              <Shield size={16} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>Code anti-phishing</h3>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-2)', lineHeight: 1.6, marginBottom: 'var(--space-3)' }}>
              Ce code apparaît dans tous nos messages. Si vous recevez un email prétendu venir de nous <strong>sans ce code</strong>, c'est une tentative de phishing.
            </p>

            {!editingPhishing ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                <div
                  style={{
                    flex: 1,
                    padding: 'var(--space-3)',
                    background: 'var(--color-surface-2)',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-base)',
                    letterSpacing: '0.05em',
                  }}
                >
                  {showPhishing ? profile.anti_phishing_code || '—' : '••••••••'}
                </div>
                <button
                  onClick={() => setShowPhishing(!showPhishing)}
                  className="btn btn-icon btn-secondary"
                  aria-label={showPhishing ? 'Masquer' : 'Afficher'}
                >
                  {showPhishing ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <button onClick={() => setEditingPhishing(true)} className="btn btn-secondary btn-sm">
                  Modifier
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <input
                  className="input"
                  type="text"
                  value={newPhishingCode}
                  onChange={(e) => setNewPhishingCode(e.target.value.replace(/\s/g, ''))}
                  placeholder="Nouveau code (4-20 caractères)"
                  maxLength={20}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button
                    onClick={handleUpdatePhishing}
                    disabled={newPhishingCode.length < 4}
                    className="btn btn-primary flex-1"
                  >
                    <Check size={16} /> Confirmer
                  </button>
                  <button
                    onClick={() => { setEditingPhishing(false); setNewPhishingCode(''); }}
                    className="btn btn-secondary"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Info sécurité */}
          <div className="card" style={{ padding: 'var(--space-4)', background: 'var(--color-info-bg)', borderColor: 'var(--color-info)' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-1)', lineHeight: 1.6 }}>
              🛡️ Nous ne vous demanderons <strong>jamais</strong> votre mot de passe ou code anti-phishing par email ou téléphone.
            </p>
          </div>

          {/* Session & password */}
          <MenuItem
            icon={<User size={18} />}
            title="Changer mon mot de passe"
            onClick={() => navigate('/forgot-password')}
          />
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // SECTION THÈME
  // ════════════════════════════════════════════════════════

  if (section === 'theme') {
    return (
      <div className="fade-in" style={{ paddingBottom: 'var(--space-8)' }}>
        <SectionHeader title="Apparence" onBack={() => setSection('main')} />

        <div className="px-4">
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)', marginBottom: 'var(--space-4)', lineHeight: 1.6 }}>
            Choisissez l'ambiance qui vous convient. Adaptez-la selon votre environnement de travail.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  toast.success(`Thème "${t.label}" activé`);
                }}
                style={{
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-lg)',
                  border: `1.5px solid ${theme === t.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: t.preview.bg,
                  color: t.preview.text,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 'var(--space-2)',
                  minHeight: 140,
                  position: 'relative',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: 24 }}>{t.icon}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-base)' }}>
                  {t.label}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', opacity: 0.75, lineHeight: 1.4 }}>
                  {t.description}
                </div>
                {theme === t.id && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'var(--space-2)',
                      right: 'var(--space-2)',
                      width: 22,
                      height: 22,
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={14} style={{ color: 'var(--color-primary-text)' }} strokeWidth={3} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // SECTION VOIX
  // ════════════════════════════════════════════════════════

  if (section === 'voice') {
    return (
      <div className="fade-in" style={{ paddingBottom: 'var(--space-8)' }}>
        <SectionHeader title="Assistance vocale" onBack={() => setSection('main')} />

        <div className="px-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Toggle activation */}
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>Activer l'assistance vocale</h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginTop: 2 }}>
                  SWAN peut lire les briefs et résumés à voix haute
                </p>
              </div>
              <Toggle
                checked={voiceSettings.enabled}
                onChange={(v) => updateVoice({ enabled: v })}
              />
            </div>
          </div>

          {voiceSettings.enabled && (
            <>
              {/* Voix */}
              <div className="card" style={{ padding: 'var(--space-4)' }}>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
                  Voix de SWAN
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                  <VoiceOption
                    label="Voix féminine"
                    name="Claire"
                    selected={voiceSettings.gender === 'female'}
                    onClick={() => {
                      updateVoice({ gender: 'female' });
                      setTimeout(() => speak('Bonjour, je suis Claire, votre assistante SWAN.'), 100);
                    }}
                  />
                  <VoiceOption
                    label="Voix masculine"
                    name="Antoine"
                    selected={voiceSettings.gender === 'male'}
                    onClick={() => {
                      updateVoice({ gender: 'male' });
                      setTimeout(() => speak('Bonjour, je suis Antoine, votre assistant SWAN.'), 100);
                    }}
                  />
                </div>
              </div>

              {/* Vitesse */}
              <div className="card" style={{ padding: 'var(--space-4)' }}>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
                  Vitesse de lecture
                </h3>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {[0.75, 1, 1.25, 1.5].map((s) => (
                    <button
                      key={s}
                      onClick={() => updateVoice({ speed: s as any })}
                      style={{
                        flex: 1,
                        minHeight: 'var(--tap-min)',
                        padding: 'var(--space-2)',
                        borderRadius: 'var(--radius-md)',
                        background: voiceSettings.speed === s ? 'var(--color-primary)' : 'var(--color-surface-2)',
                        color: voiceSettings.speed === s ? 'var(--color-primary-text)' : 'var(--color-text-1)',
                        border: '1px solid var(--color-border)',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all var(--duration-fast)',
                      }}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Lecture auto */}
              <div className="card" style={{ padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>Lecture automatique</h3>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginTop: 2 }}>
                      Lire le brief quotidien à l'ouverture
                    </p>
                  </div>
                  <Toggle
                    checked={voiceSettings.autoRead}
                    onChange={(v) => updateVoice({ autoRead: v })}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // SECTION DONNÉES & RGPD
  // ════════════════════════════════════════════════════════

  if (section === 'data') {
    return (
      <div className="fade-in" style={{ paddingBottom: 'var(--space-8)' }}>
        <SectionHeader title="Mes données" onBack={() => setSection('main')} />

        <div className="px-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              <Shield size={16} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>Vos droits RGPD</h3>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-2)', lineHeight: 1.6 }}>
              Vos données sont hébergées en France, chiffrées et jamais revendues. Vous pouvez les exporter ou demander leur suppression à tout moment.
            </p>
          </div>

          <MenuItem
            icon={<Download size={18} />}
            title="Exporter mes données"
            subtitle={profile.free_export_used ? 'Export payant (sur devis)' : 'Gratuit, 1 fois par an'}
            onClick={() => toast.info('Fonctionnalité à venir à l\'étape 1.8')}
          />
        </div>
      </div>
    );
  }

  return null;
}

// ════════════════════════════════════════════════════════════
// SOUS-COMPOSANTS
// ════════════════════════════════════════════════════════════

function SectionHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="page-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <button onClick={onBack} className="back-button" aria-label="Retour">
          <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <h1 className="page-header-title">{title}</h1>
      </div>
    </header>
  );
}

function MenuItem({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="card card-interactive"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-4)',
        textAlign: 'left',
        minHeight: 'var(--tap-comfort)',
        border: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        cursor: 'pointer',
        width: '100%',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-2)',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-1)' }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginTop: 2 }}>
            {subtitle}
          </div>
        )}
      </div>
      <ChevronRight size={16} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
    </button>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      style={{
        width: 48,
        height: 28,
        borderRadius: 'var(--radius-full)',
        background: checked ? 'var(--color-primary)' : 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background var(--duration-fast)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 22 : 2,
          width: 22,
          height: 22,
          borderRadius: 'var(--radius-full)',
          background: '#FFFFFF',
          transition: 'left var(--duration-fast) var(--ease-spring)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  );
}

function VoiceOption({ label, name, selected, onClick }: { label: string; name: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: 'var(--space-3)',
        borderRadius: 'var(--radius-md)',
        background: selected ? 'var(--color-primary-glow)' : 'var(--color-surface-2)',
        border: `1.5px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all var(--duration-fast)',
      }}
    >
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: selected ? 'var(--color-primary)' : 'var(--color-text-1)' }}>
        {name}
      </div>
    </button>
  );
}

function getInitials(name: string | null): string {
  if (!name) return 'U';
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
}
