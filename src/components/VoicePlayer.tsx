// ============================================================
// SWAN · HUB — Voice Player
// Petit lecteur qui lit un texte à voix haute (brief, résumé IA)
// Contrôles : Play, Pause, Vitesse
// ============================================================

import { useState } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { useVoice, VoiceSpeed } from '@/hooks/useVoice';

interface VoicePlayerProps {
  text: string;
  label?: string;
  compact?: boolean;
  variant?: 'default' | 'round';
}

export function VoicePlayer({ text, label = 'Écouter', compact = false, variant = 'default' }: VoicePlayerProps) {
  const { speak, stopSpeaking, isSpeaking, settings, updateSettings, isSupported } = useVoice();
  const [showSpeed, setShowSpeed] = useState(false);

  if (!isSupported || !text.trim()) return null;

  const handleToggle = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speak(text);
    }
  };

  const speedOptions: VoiceSpeed[] = [0.75, 1, 1.25, 1.5];

  if (variant === 'round') {
    return (
      <button
        onClick={handleToggle}
        aria-label={isSpeaking ? 'Arrêter la lecture' : label}
        title={isSpeaking ? 'Arrêter la lecture' : label}
        style={{
          width: 'var(--tap-comfort)',
          height: 'var(--tap-comfort)',
          minWidth: 'var(--tap-comfort)',
          minHeight: 'var(--tap-comfort)',
          borderRadius: 'var(--radius-full)',
          border: isSpeaking ? '1px solid var(--color-danger)' : '1px solid rgba(201, 169, 97, 0.45)',
          background: isSpeaking ? 'var(--color-danger-bg)' : 'var(--gradient-gold)',
          color: isSpeaking ? 'var(--color-danger)' : 'var(--color-primary-text)',
          boxShadow: isSpeaking ? 'var(--shadow-md)' : 'var(--shadow-glow-sm), var(--shadow-md)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'transform var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)',
        }}
      >
        {isSpeaking ? <Pause size={24} /> : <Volume2 size={25} />}
      </button>
    );
  }

  // Version compacte (inline dans une carte)
  if (compact) {
    return (
      <button
        onClick={handleToggle}
        className="btn btn-sm btn-ghost"
        style={{ gap: 'var(--space-2)', minHeight: 'var(--tap-min)' }}
        aria-label={isSpeaking ? 'Arrêter la lecture' : 'Écouter'}
      >
        {isSpeaking ? (
          <>
            <Pause size={14} />
            <span>Stop</span>
          </>
        ) : (
          <>
            <Volume2 size={14} />
            <span>{label}</span>
          </>
        )}
      </button>
    );
  }

  // Version complète
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-2) var(--space-3)',
        background: 'var(--color-surface-2)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
      }}
    >
      <button
        onClick={handleToggle}
        aria-label={isSpeaking ? 'Pause' : 'Écouter'}
        style={{
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-full)',
          background: isSpeaking ? 'var(--color-primary)' : 'var(--color-surface)',
          color: isSpeaking ? 'var(--color-primary-text)' : 'var(--color-text-1)',
          border: '1px solid var(--color-border-hover)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all var(--duration-fast) var(--ease-out)',
          flexShrink: 0,
        }}
      >
        {isSpeaking ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
      </button>

      <div style={{ flex: 1, fontSize: 'var(--text-xs)', color: 'var(--color-text-2)' }}>
        {isSpeaking ? 'SWAN lit le texte…' : label}
      </div>

      {/* Vitesse */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowSpeed(!showSpeed)}
          className="btn btn-sm btn-ghost"
          style={{ minHeight: 'var(--tap-min)', minWidth: 'auto', padding: '4px 10px', fontSize: 'var(--text-xs)' }}
        >
          {settings.speed}x
        </button>

        {showSpeed && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              right: 0,
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              padding: 'var(--space-1)',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              zIndex: 10,
              minWidth: 80,
            }}
          >
            {speedOptions.map((s) => (
              <button
                key={s}
                onClick={() => {
                  updateSettings({ speed: s });
                  setShowSpeed(false);
                }}
                style={{
                  padding: '8px 12px',
                  background: settings.speed === s ? 'var(--color-primary-glow)' : 'transparent',
                  color: settings.speed === s ? 'var(--color-primary)' : 'var(--color-text-1)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: 'var(--text-xs)',
                  fontWeight: settings.speed === s ? 600 : 400,
                  textAlign: 'left',
                }}
              >
                {s}x
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
