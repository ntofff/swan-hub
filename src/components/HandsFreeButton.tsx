// ============================================================
// SWAN · HUB — Hands-Free Button
// Gros bouton flottant accessible d'une main (conduite, marche)
// Déclenche l'écoute vocale et l'interaction avec SWAN
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useVoice } from '@/hooks/useVoice';
import { toast } from 'sonner';

interface HandsFreeButtonProps {
  /** Position du bouton */
  position?: 'bottom-right' | 'bottom-center' | 'inline';
  /** Mode : dictée simple ou conversation */
  mode?: 'dictation' | 'conversation';
  /** Callback à la fin de la dictée */
  onTranscript?: (text: string) => void;
  /** Taille du bouton */
  size?: 'normal' | 'large';
  /** Label personnalisé */
  label?: string;
}

export function HandsFreeButton({
  position = 'bottom-right',
  mode = 'dictation',
  onTranscript,
  size = 'normal',
  label,
}: HandsFreeButtonProps) {
  const { speak, startListening, stopListening, isListening, isSpeaking, isSupported } = useVoice();
  const [processing, setProcessing] = useState(false);

  // ── Déclenchement de l'écoute ───────────────────────────
  const handlePress = useCallback(() => {
    if (!isSupported) {
      toast.error('Reconnaissance vocale non supportée sur ce navigateur');
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    // Son d'accueil (SWAN)
    if (mode === 'conversation') {
      speak('Je vous écoute');
    }

    // Démarrage écoute
    startListening({
      continuous: mode === 'conversation',
      onResult: (text, isFinal) => {
        if (isFinal && onTranscript) {
          onTranscript(text);
        }
      },
      onEnd: () => {
        setProcessing(false);
      },
    });
  }, [isSupported, isListening, mode, startListening, stopListening, speak, onTranscript]);

  // ── Styles selon position ───────────────────────────────
  const getPositionStyles = (): React.CSSProperties => {
    const safeInset = 'max(env(safe-area-inset-bottom), var(--space-4))';
    switch (position) {
      case 'bottom-right':
        return {
          position: 'fixed',
          bottom: `calc(var(--tap-comfort) + ${safeInset} + var(--space-4))`,
          right: 'var(--space-4)',
          zIndex: 'var(--z-above)',
        };
      case 'bottom-center':
        return {
          position: 'fixed',
          bottom: `calc(var(--tap-comfort) + ${safeInset} + var(--space-4))`,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 'var(--z-above)',
        };
      case 'inline':
      default:
        return {};
    }
  };

  // ── Taille du bouton ────────────────────────────────────
  const buttonSize = size === 'large' ? 80 : 64;
  const iconSize   = size === 'large' ? 32 : 26;

  if (!isSupported) return null;

  return (
    <div style={getPositionStyles()}>
      <button
        onClick={handlePress}
        aria-label={isListening ? 'Arrêter l\'écoute' : 'Activer le mode mains libres'}
        style={{
          width: buttonSize,
          height: buttonSize,
          borderRadius: 'var(--radius-full)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isListening
            ? 'var(--color-danger)'
            : isSpeaking
            ? 'var(--color-success)'
            : 'var(--color-success)',
          color: '#FFFFFF',
          boxShadow: isListening
            ? '0 0 0 8px rgba(193,75,62,0.2), var(--shadow-lg)'
            : 'var(--shadow-lg)',
          transition: 'all var(--duration-fast) var(--ease-spring)',
          position: 'relative',
        }}
        className={isListening ? 'pulse-recording' : ''}
      >
        {processing ? (
          <Loader2 size={iconSize} className="spin" />
        ) : isListening ? (
          <MicOff size={iconSize} strokeWidth={2.2} />
        ) : (
          <Mic size={iconSize} strokeWidth={2.2} />
        )}

        {/* Label optionnel */}
        {label && (
          <span
            style={{
              position: 'absolute',
              top: -28,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              color: 'var(--color-text-1)',
              background: 'var(--color-bg-elevated)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--color-border)',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {label}
          </span>
        )}
      </button>

      <style>{`
        @keyframes pulseRecording {
          0%, 100% {
            box-shadow: 0 0 0 8px rgba(193,75,62,0.25), var(--shadow-lg);
          }
          50% {
            box-shadow: 0 0 0 16px rgba(193,75,62,0.08), var(--shadow-lg);
          }
        }
        .pulse-recording {
          animation: pulseRecording 1.4s ease-in-out infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
