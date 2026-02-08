import { defineStore } from 'pinia';
import { View } from '../types/Types';
import SecureLS from 'secure-ls';
import { getTitlebarColor, isDarkTheme } from '../constants';

const ls = new SecureLS();

const ENCRYPTED_KEYS = [
  'prevOutputPath', 'segOutputPath', 'segSuffix', 'hypThumbOutputPath',
  'transOutputPath', 'transMethod', 'conOutputPath',
  's3AccessKey', 's3BucketName', 's3SecretKey',
] as const;
type EncryptedKey = (typeof ENCRYPTED_KEYS)[number];

function loadStoredTheme(): string {
  const storedTheme = localStorage.getItem('theme');
  return storedTheme ?? 'dark';
}

function loadStoredView(): View {
  const storedView = localStorage.getItem('view') as View;
  return storedView ?? 'Preview Generator';
}

function loadStoredEncryptedString(key: string): string {
  try {
    const data = ls.get(key);
    return (data && typeof data === 'object' && 'data' in data) ? (data as { data: string }).data : '';
  } catch {
    return '';
  }
}


export const useAppStore = defineStore({
  id: 'appStore',
  state: () => ({
    prevOutputPath: loadStoredEncryptedString('prevOutputPath'),
    segOutputPath: loadStoredEncryptedString('segOutputPath'),
    segSuffix: loadStoredEncryptedString('segSuffix'),
    hypThumbOutputPath: loadStoredEncryptedString('hypThumbOutputPath'),
    transOutputPath: loadStoredEncryptedString('transOutputPath'),
    transMethod: loadStoredEncryptedString('transMethod'),
    conOutputPath: loadStoredEncryptedString('conOutputPath'),

    s3AccessKey: loadStoredEncryptedString('s3AccessKey'),
    s3BucketName: loadStoredEncryptedString('s3BucketName'),
    s3SecretKey: loadStoredEncryptedString('s3SecretKey'),
    selectedView: loadStoredView(),
    theme: loadStoredTheme(),
  }),
  getters: {
    themeType(): 'dark' | 'light' {
      return isDarkTheme(this.theme) ? 'dark' : 'light';
    },
  },
  actions: {
    setSelectedView(newSelectedView: View){
      this.selectedView = newSelectedView;
      localStorage.setItem('view', newSelectedView);
    },
    setTitleBarStyle(theme: string) {
      const titlebar = document.querySelector<HTMLElement>('.cet-titlebar');
      if (titlebar) {
        titlebar.style.backgroundColor = getTitlebarColor(theme);
      }
    },
    setTheme(newTheme: string) {
      // change theme
      this.theme = newTheme;
      localStorage.setItem('theme', this.theme);
      // change titlebar color
      this.setTitleBarStyle(newTheme)
    },
    setEncrypted(key: EncryptedKey, value: string) {
      (this as Record<string, string>)[key] = value;
      ls.set(key, { data: value });
    },
    setS3Data(s3BucketName: string, s3AccessKey: string, s3SecretKey: string) {
      this.setEncrypted('s3BucketName', s3BucketName);
      this.setEncrypted('s3AccessKey', s3AccessKey);
      this.setEncrypted('s3SecretKey', s3SecretKey);
    },
    setPrevOutputPath(path: string) {
      this.setEncrypted('prevOutputPath', path);
    },
    setSegOutputPath(path: string) {
      this.setEncrypted('segOutputPath', path);
    },
    setSegSuffix(suffix: string) {
      this.setEncrypted('segSuffix', suffix);
    },
    setHypThumbOutputPath(path: string) {
      this.setEncrypted('hypThumbOutputPath', path);
    },
    setTransOutputPath(path: string) {
      this.setEncrypted('transOutputPath', path);
    },
    setTransMethod(method: string) {
      this.setEncrypted('transMethod', method);
    },
    setConOutputPath(path: string) {
      this.setEncrypted('conOutputPath', path);
    },
  },
});