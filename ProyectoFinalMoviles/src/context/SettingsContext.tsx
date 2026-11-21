import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

const SETTINGS_KEY = 'settings';

// Ordering options the API accepts in ?ordering= (see ordering_fields in DishViewSet)
export const SORT_OPTIONS = [
  { value: 'name', text: 'Nombre (A-Z)' },
  { value: 'base_price', text: 'Precio: menor a mayor' },
  { value: '-base_price', text: 'Precio: mayor a menor' },
  { value: '-created', text: 'Más recientes' },
];

export const PAGE_SIZE_OPTIONS = [5, 10, 20, 30];

export interface Settings {
  pageSize: number;
  defaultOrdering: string;
  showUnavailable: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  pageSize: 10,
  defaultOrdering: 'name',
  showUnavailable: true,
};

interface SettingsContextValue {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const Context = createContext<SettingsContextValue | null>(null);

/**
 * User preferences saved on the device (not on the server).
 * Any screen can read them with useSettings().
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((saved) => {
      // Merged with the defaults in case a new version adds another setting
      if (saved) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
    });
  }, []);

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((previous) => {
      const updated = { ...previous, [key]: value };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return <Context.Provider value={{ settings, updateSetting }}>{children}</Context.Provider>;
}

export function useSettings() {
  const context = useContext(Context);
  if (!context) throw new Error('useAjustes debe usarse dentro de <AjustesProvider>');
  return context;
}
