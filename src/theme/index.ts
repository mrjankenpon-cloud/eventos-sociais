export const THEME = {
  colors: {
    primary: '#1655a3',
    primaryDark: '#0d2a50',
    primaryDeeper: '#051529',
    primaryMuted: '#e8f0f8',
    secondary: '#ffffff',
    accent: '#eab308',
    background: {
      public: '#f8fafc',
      admin: '#f9fafb',
      dark: '#030712',
    },
    text: {
      primary: '#111827',
      secondary: '#6b7280',
      muted: '#9ca3af',
    },
    status: {
      active: '#16a34a',
      inactive: '#ef4444',
      pending: '#f59e0b',
    },
  },
  spacing: {
    container: 'max-w-7xl',
    header: {
      height: '115px',
      scrolledHeight: '85px',
    },
  },
  radius: {
    card: '32px',
    button: '9999px',
    input: '16px',
    adminCard: '24px',
    dialog: '40px',
  },
  motion: {
    ease: [0.22, 1, 0.36, 1] as const,
    duration: 0.35,
  },
} as const;
