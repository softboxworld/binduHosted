type ThemeColors = {
  background: {
    primary: string;
    secondary: string;
    accent: string;
    hover: string;
    hoverDarker: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    muted: string;
    accent: string;
    inverse: string;
  };
  border: {
    primary: string;
    secondary: string;
  };
  interactive: {
    hover: {
      text: string;
      background: string;
    };
  };
  sidebar: {
    background: string;
    itemHover: string;
    itemActive: string;
    itemActiveText: string;
    shadow: string;
  };
  header: {
    background: string;
    buttonHover: string;
  };
  avatar: {
    background: string;
    text: string;
  };
  modal: {
    background: string;
    overlay: string;
  };
};

export const themeConfig: Record<'light' | 'dark', ThemeColors> = {
  light: {
    background: {
      primary: 'bg-gray-50',
      secondary: 'bg-gray-100',
      accent: 'bg-gray-200',
      hover: 'hover:bg-gray-100',
      hoverDarker: 'hover:bg-gray-200',
    },
    text: {
      primary: 'text-gray-900',
      secondary: 'text-gray-700',
      tertiary: 'text-gray-600',
      muted: 'text-gray-500',
      accent: 'text-gray-400',
      inverse: 'text-white',
    },
    border: {
      primary: 'border-gray-200',
      secondary: 'border-gray-300',
    },
    interactive: {
      hover: {
        text: 'hover:text-gray-900',
        background: 'hover:bg-gray-50',
      },
    },
    sidebar: {
      background: 'bg-gray-50',
      itemHover: 'hover:bg-gray-300',
      itemActive: 'bg-black',
      itemActiveText: 'text-white',
      shadow: 'shadow-gray-200',
    },
    header: {
      background: 'bg-gray-50',
      buttonHover: 'hover:bg-gray-100',
    },
    avatar: {
      background: 'bg-gray-200',
      text: 'text-gray-600',
    },
    modal: {
      background: 'bg-white',
      overlay: 'bg-black bg-opacity-50',
    },
  },
  dark: {
    background: {
      primary: 'bg-gray-800',
      secondary: 'bg-gray-900',
      accent: 'bg-gray-800',
      hover: 'hover:bg-gray-700',
      hoverDarker: 'hover:bg-gray-600',
    },
    text: {
      primary: 'text-white',
      secondary: 'text-gray-300',
      tertiary: 'text-gray-400',
      muted: 'text-gray-500',
      accent: 'text-gray-400',
      inverse: 'text-gray-900',
    },
    border: {
      primary: 'border-gray-600',
      secondary: 'border-gray-500',
    },
    interactive: {
      hover: {
        text: 'hover:text-white',
        background: 'hover:bg-gray-700',
      },
    },
    sidebar: {
      background: 'bg-gray-800',
      itemHover: 'hover:bg-gray-700',
      itemActive: 'bg-white',
      itemActiveText: 'text-black',
      shadow: 'shadow-gray-900',
    },
    header: {
      background: 'bg-gray-800',
      buttonHover: 'hover:bg-gray-700',
    },
    avatar: {
      background: 'bg-gray-700',
      text: 'text-gray-300',
    },
    modal: {
      background: 'bg-gray-800',
      overlay: 'bg-black bg-opacity-50',
    },
  },
};

export type ThemeMode = keyof typeof themeConfig;

type NestedKeyOf<T> = {
  [K in keyof T]: T[K] extends object
    ? [K] | [K, ...NestedKeyOf<T[K]>]
    : [K]
}[keyof T];

export function getThemeStyle<T extends NestedKeyOf<ThemeColors>>(
  mode: ThemeMode,
  ...path: T
): string {
  return path.reduce((obj, key) => obj[key], themeConfig[mode] as any) as string;
} 