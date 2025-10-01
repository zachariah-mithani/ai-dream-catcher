// Theme definitions
export const themes = {
  dreamy: {
    name: 'Dreamy',
    colors: {
      // Pastel gradient theme inspired by dream catcher
      background: '#f8fafc', // Very light background
      card: '#ffffff', // Pure white cards
      surface: '#f1f5f9', // Light surface
      text: '#1e293b', // Dark text for contrast
      textSecondary: '#64748b', // Muted text
      primary: '#8b5cf6', // Purple accent
      primaryText: '#ffffff',
      border: '#e2e8f0', // Light border
      danger: '#f87171', // Soft red
      accent: '#06b6d4', // Cyan accent
      success: '#10b981', // Soft green
      warning: '#f59e0b', // Soft orange
      input: '#f1f5f9',
      switchTrack: { false: '#cbd5e1', true: '#8b5cf6' },
      switchThumb: '#ffffff',
      // Better contrast for buttons
      buttonSecondary: '#e2e8f0', // Light gray for unselected buttons
      buttonSecondaryText: '#475569' // Darker text for better contrast
    },
    gradients: {
      background: ['#ffd1a1', '#f8b5d1', '#c4b5fd', '#a5f3fc'], // Peach to pink to lavender to cyan (matching logo gradient)
      primary: ['#8b5cf6', '#06b6d4'],
      card: ['#ffffff', '#f8fafc']
    }
  },
  minimalistLight: {
    name: 'Light',
    colors: {
      background: '#ffffff', // Pure white
      card: '#ffffff', // Pure white
      surface: '#fafafa', // Very light gray
      text: '#000000', // Pure black
      textSecondary: '#666666', // Medium gray
      primary: '#000000', // Black accent
      primaryText: '#ffffff',
      border: '#e0e0e0', // Light gray border
      danger: '#ff4444', // Red
      accent: '#666666', // Gray accent
      success: '#00aa00', // Green
      warning: '#ff8800', // Orange
      input: '#fafafa',
      switchTrack: { false: '#e0e0e0', true: '#000000' },
      switchThumb: '#ffffff',
      // Better contrast for buttons
      buttonSecondary: '#e2e8f0', // Light gray for unselected buttons
      buttonSecondaryText: '#111111' // Dark text for contrast
    },
    gradients: {
      background: ['#ffffff', '#fafafa'], // White to very light gray
      primary: ['#000000', '#333333'],
      card: ['#ffffff', '#ffffff']
    }
  },
  minimalistBlack: {
    name: 'Dark',
    colors: {
      background: '#000000', // Pure black
      card: '#000000', // Pure black
      surface: '#111111', // Very dark gray
      text: '#ffffff', // Pure white
      textSecondary: '#cccccc', // Light gray
      primary: '#ffffff', // White accent
      primaryText: '#000000',
      border: '#333333', // Dark gray border
      danger: '#ff6666', // Light red
      accent: '#cccccc', // Light gray accent
      success: '#66ff66', // Light green
      warning: '#ffaa66', // Light orange
      input: '#111111',
      switchTrack: { false: '#333333', true: '#ffffff' },
      switchThumb: '#000000',
      // Better contrast for buttons
      buttonSecondary: '#333333', // Dark gray for unselected buttons
      buttonSecondaryText: '#ffffff' // White text for contrast
    },
    gradients: {
      background: ['#000000', '#111111'], // Black to very dark gray
      primary: ['#ffffff', '#cccccc'],
      card: ['#000000', '#000000']
    }
  }
};

// Default theme
export const colors = themes.dreamy.colors;

export const spacing = (n) => n * 8;

// Theme-specific shadows
export const getShadow = (theme) => {
  switch (theme) {
    case 'dreamy':
      return {
        shadowColor: '#8b5cf6',
        shadowOpacity: 0.15,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8
      };
    case 'minimalistLight':
      return {
        shadowColor: '#000000',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4
      };
    case 'minimalistBlack':
      return {
        shadowColor: '#ffffff',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4
      };
    default:
      return {
        shadowColor: '#8b5cf6',
        shadowOpacity: 0.15,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8
      };
  }
};

// Bubbly styling constants
export const borderRadius = {
  small: 12,
  medium: 16,
  large: 24,
  xlarge: 32
};


