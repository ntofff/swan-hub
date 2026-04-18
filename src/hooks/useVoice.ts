// ============================================================
// SWAN · HUB — Hook vocal universel
// Lecture vocale (TTS) + Reconnaissance vocale (STT)
// Web Speech API native (gratuit, cross-browser moderne)
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ────────────────────────────────────────────────────
export type VoiceGender = 'male' | 'female';
export type VoiceSpeed  = 0.75 | 1 | 1.25 | 1.5;

export interface VoiceSettings {
  enabled: boolean;
  gender: VoiceGender;
  speed: VoiceSpeed;
  autoRead: boolean;   // Lire automatiquement les briefs SWAN
}

const DEFAULT_SETTINGS: VoiceSettings = {
  enabled: true,
  gender: 'female',
  speed: 1,
  autoRead: false,
};

const STORAGE_KEY = 'swan_voice_settings';

// ── Cache voix disponibles ──────────────────────────────────
let availableVoices: SpeechSynthesisVoice[] = [];

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve([]);
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices());
    };
  });
}

// Sélection de la meilleure voix française par genre
function pickFrenchVoice(voices: SpeechSynthesisVoice[], gender: VoiceGender): SpeechSynthesisVoice | null {
  const fr = voices.filter((v) => v.lang.startsWith('fr'));
  if (fr.length === 0) return voices[0] ?? null;

  // Noms connus par genre (best effort cross-browser)
  const femaleNames = ['amélie', 'audrey', 'virginie', 'marion', 'claire', 'marie', 'cécile', 'female', 'femme'];
  const maleNames   = ['thomas', 'antoine', 'nicolas', 'paul', 'daniel', 'male', 'homme'];

  const matcher = gender === 'female' ? femaleNames : maleNames;
  const matched = fr.find((v) => matcher.some((n) => v.name.toLowerCase().includes(n)));
  if (matched) return matched;

  // Fallback : voix google/microsoft FR
  const google = fr.find((v) => v.name.toLowerCase().includes('google'));
  if (google) return google;

  return fr[0];
}

// ── Settings helpers ────────────────────────────────────────
function loadSettings(): VoiceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: VoiceSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

// ════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ════════════════════════════════════════════════════════════

export function useVoice() {
  const [settings, setSettings] = useState<VoiceSettings>(loadSettings);
  const [isSpeaking, setIsSpeaking]         = useState(false);
  const [isListening, setIsListening]       = useState(false);
  const [transcript, setTranscript]         = useState('');
  const [isSupported, setIsSupported]       = useState(true);

  const recognitionRef = useRef<any>(null);

  // ── Vérification du support navigateur ──────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasSynthesis = 'speechSynthesis' in window;
    const hasRecognition =
      'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    setIsSupported(hasSynthesis || hasRecognition);
  }, []);

  // ── Pré-chargement des voix ─────────────────────────────
  useEffect(() => {
    loadVoices().then((voices) => {
      availableVoices = voices;
    });
  }, []);

  // ── Mise à jour des settings ────────────────────────────
  const updateSettings = useCallback((updates: Partial<VoiceSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      saveSettings(next);
      return next;
    });
  }, []);

  // ════════════════════════════════════════════════════════
  // TEXT-TO-SPEECH — SWAN parle
  // ════════════════════════════════════════════════════════

  const speak = useCallback(
    async (text: string, options?: { onEnd?: () => void }) => {
      if (!settings.enabled || !text.trim()) return;
      if (typeof window === 'undefined' || !window.speechSynthesis) return;

      // Arrête tout discours en cours
      window.speechSynthesis.cancel();

      // S'assure que les voix sont chargées
      if (availableVoices.length === 0) {
        availableVoices = await loadVoices();
      }

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'fr-FR';
      utter.rate = settings.speed;
      utter.pitch = 1;
      utter.volume = 1;

      const voice = pickFrenchVoice(availableVoices, settings.gender);
      if (voice) utter.voice = voice;

      utter.onstart = () => setIsSpeaking(true);
      utter.onend = () => {
        setIsSpeaking(false);
        options?.onEnd?.();
      };
      utter.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utter);
    },
    [settings]
  );

  const stopSpeaking = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  // ════════════════════════════════════════════════════════
  // SPEECH-TO-TEXT — Vous parlez
  // ════════════════════════════════════════════════════════

  const startListening = useCallback(
    (options?: {
      continuous?: boolean;
      onResult?: (text: string, isFinal: boolean) => void;
      onEnd?: () => void;
    }) => {
      if (typeof window === 'undefined') return;
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) return;

      // Arrête toute écoute précédente
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }

      const recognition = new SR();
      recognition.lang = 'fr-FR';
      recognition.continuous = options?.continuous ?? false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let finalTranscript = '';

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalTranscript += res[0].transcript;
          } else {
            interim += res[0].transcript;
          }
        }
        const fullText = finalTranscript + interim;
        setTranscript(fullText);
        options?.onResult?.(fullText, event.results[event.results.length - 1]?.isFinal ?? false);
      };

      recognition.onerror = (e: any) => {
        console.error('Erreur reconnaissance vocale:', e.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        options?.onEnd?.();
      };

      recognitionRef.current = recognition;
      setTranscript('');
      recognition.start();
      setIsListening(true);
    },
    []
  );

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // ── Cleanup au démontage ────────────────────────────────
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  return {
    // Settings
    settings,
    updateSettings,
    isSupported,

    // TTS
    speak,
    stopSpeaking,
    isSpeaking,

    // STT
    startListening,
    stopListening,
    isListening,
    transcript,
  };
}
