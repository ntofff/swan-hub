// ============================================================
// SWAN · HUB — Loading Screen
// Écran de chargement avec logo animé
// ============================================================

export function LoadingScreen() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
        gap: 'var(--space-6)',
        zIndex: 'var(--z-supreme)',
      }}
    >
      <div
        className="pulse-gold"
        style={{
          width: '64px',
          height: '64px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--gradient-gold)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-xl)',
          fontWeight: 800,
          color: 'var(--color-primary-text)',
        }}
      >
        S
      </div>
      <div style={{ textAlign: 'center' }}>
        <div
          className="text-gold"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-lg)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
          }}
        >
          SWAN · HUB
        </div>
        <div
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-3)',
            marginTop: 'var(--space-1)',
          }}
        >
          Chargement…
        </div>
      </div>
    </div>
  );
}
