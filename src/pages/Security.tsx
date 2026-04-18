// ============================================================
// SWAN · HUB — Page Sécurité
// Page publique rassurante sur la protection des données
// ============================================================

import { useNavigate } from 'react-router-dom';
import {
  Shield, Lock, Database, MapPin, Key, FileCheck,
  AlertTriangle, Mail, ChevronLeft, ChevronRight,
} from 'lucide-react';

export default function Security() {
  const navigate = useNavigate();

  return (
    <div className="fade-in" style={{ paddingBottom: 'var(--space-8)', minHeight: '100dvh' }}>
      <header className="page-header">
        <button onClick={() => navigate(-1)} className="back-button" aria-label="Retour">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="page-header-title">Votre sécurité</h1>
          <p className="page-header-subtitle">Une priorité absolue pour nous</p>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="px-4" style={{ marginBottom: 'var(--space-6)' }}>
        <div
          className="card card-glow"
          style={{
            padding: 'var(--space-6)',
            textAlign: 'center',
            background: 'linear-gradient(145deg, rgba(201,169,97,0.05), var(--color-surface))',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 'var(--radius-full)',
              background: 'var(--gradient-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-4)',
            }}
          >
            <Shield size={32} style={{ color: 'var(--color-primary-text)' }} />
          </div>
          <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>
            Vos données nous sont confiées
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)', lineHeight: 1.6 }}>
            Nous les traitons comme nous traiterions les nôtres : avec vigilance, transparence et le plus grand soin.
          </p>
        </div>
      </section>

      {/* ── Garanties chiffrées ── */}
      <section className="px-4" style={{ marginBottom: 'var(--space-6)' }}>
        <h2 className="text-label" style={{ marginBottom: 'var(--space-3)' }}>
          Nos garanties
        </h2>

        <div className="grid-2">
          <GuaranteeCard
            icon={<MapPin size={20} />}
            label="Hébergement France"
            value="🇫🇷 Francfort"
            detail="Supabase UE"
          />
          <GuaranteeCard
            icon={<Lock size={20} />}
            label="Chiffrement"
            value="TLS 1.3"
            detail="AES-256 stockage"
          />
          <GuaranteeCard
            icon={<Database size={20} />}
            label="Backups"
            value="3 copies"
            detail="Toutes les 6h"
          />
          <GuaranteeCard
            icon={<FileCheck size={20} />}
            label="Conformité"
            value="RGPD"
            detail="100%"
          />
        </div>
      </section>

      {/* ── Engagements ── */}
      <section className="px-4" style={{ marginBottom: 'var(--space-6)' }}>
        <h2 className="text-label" style={{ marginBottom: 'var(--space-3)' }}>
          Nos engagements
        </h2>

        <div className="card" style={{ padding: 'var(--space-4)' }}>
          {[
            'Données hébergées en France, jamais vendues',
            'Conformité RGPD totale (registre des traitements)',
            'Chiffrement de bout en bout des communications',
            'Backups quotidiens sur sites géographiquement distincts',
            'Audits de sécurité réguliers (monitoring temps réel)',
            'Export libre et complet de vos données (RGPD)',
            'Suppression immédiate sur simple demande',
            'Code anti-phishing personnel dans tous nos messages',
          ].map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) 0',
                borderBottom: i < 7 ? '1px solid var(--color-border)' : 'none',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-success-bg)',
                  color: 'var(--color-success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                ✓
              </div>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-1)', lineHeight: 1.5 }}>
                {item}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Anti-phishing ── */}
      <section className="px-4" style={{ marginBottom: 'var(--space-6)' }}>
        <h2 className="text-label" style={{ marginBottom: 'var(--space-3)' }}>
          Protection anti-phishing
        </h2>

        <div className="card" style={{ padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
            <Key size={20} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
                Votre code personnel, notre signature
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)', lineHeight: 1.6, marginBottom: 'var(--space-3)' }}>
                Chaque message que nous vous envoyons (email, SMS, notification) contient votre code personnel.
                Si vous recevez un message prétendu venir de SWAN HUB <strong>sans ce code</strong>, c'est une tentative de phishing.
              </p>

              <div
                style={{
                  padding: 'var(--space-3)',
                  background: 'var(--color-warning-bg)',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: '3px solid var(--color-warning)',
                }}
              >
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 4 }}>
                  <AlertTriangle size={14} style={{ color: 'var(--color-warning)' }} />
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-warning)' }}>
                    Rappels importants
                  </span>
                </div>
                <ul style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-1)', lineHeight: 1.6, paddingLeft: 'var(--space-4)', margin: 0 }}>
                  <li>Nous ne demanderons jamais votre mot de passe par email</li>
                  <li>Nous ne vous demanderons jamais votre code anti-phishing</li>
                  <li>Nous ne ferons jamais de demande de virement urgent</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact RGPD ── */}
      <section className="px-4">
        <div
          className="card"
          style={{
            padding: 'var(--space-4)',
            background: 'var(--color-primary-glow)',
            borderColor: 'rgba(201,169,97,0.3)',
          }}
        >
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <Mail size={20} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 2 }}>
                Contact RGPD
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-2)' }}>
                rgpd@swanhub.fr · Réponse sous 30 jours
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
            marginTop: 'var(--space-4)',
          }}
        >
          <LegalLink label="Politique de confidentialité" path="/legal/privacy" />
          <LegalLink label="Conditions générales (CGV)" path="/legal/cgv" />
          <LegalLink label="Conditions d'utilisation (CGU)" path="/legal/cgu" />
          <LegalLink label="Mentions légales" path="/legal/mentions" />
        </div>
      </section>
    </div>
  );
}

// ── Composants ──────────────────────────────────────────────

function GuaranteeCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="kpi-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
        <div style={{ color: 'var(--color-primary)' }}>{icon}</div>
        <div className="kpi-label" style={{ margin: 0 }}>{label}</div>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-lg)',
          fontWeight: 700,
          color: 'var(--color-text-1)',
          marginBottom: 2,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>{detail}</div>
    </div>
  );
}

function LegalLink({ label, path }: { label: string; path: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(path)}
      className="card card-interactive"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-3) var(--space-4)',
        textAlign: 'left',
        minHeight: 'var(--tap-min)',
        cursor: 'pointer',
        width: '100%',
      }}
    >
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-1)' }}>{label}</span>
      <ChevronRight size={16} style={{ color: 'var(--color-text-3)' }} />
    </button>
  );
}
