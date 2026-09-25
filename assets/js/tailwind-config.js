tailwind.config = {
  theme: {
    extend: {
      colors: {
        background: '#f5f1e8',
        foreground: '#1d2926',
        primary: '#173e36',
        'primary-foreground': '#f8f4eb',
        secondary: '#dce9df',
        'secondary-foreground': '#31564a',
        muted: '#e8e2d7',
        'muted-foreground': '#68716c',
        card: '#fffdf8',
        'card-border': '#d9d5c9',
        border: '#d9d5c9',
        accent: '#e86f45'
      },
      fontFamily: {
        display: ['Fredoka', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['DM Mono', 'monospace']
      },
      boxShadow: {
        soft: '0 16px 40px rgba(29, 41, 38, .08)',
        lift: '0 18px 34px rgba(29, 41, 38, .14)'
      }
    }
  }
};
