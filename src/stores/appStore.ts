import { defineStore } from 'pinia';
import { View } from '../types/Types';
import SecureLS from 'secure-ls';
const ls = new SecureLS;

function loadStoredTheme(): string {
  const storedTheme = localStorage.getItem('theme');
  return storedTheme ? storedTheme : 'dark';
}

function loadStoredView(): View {
  const storedView = localStorage.getItem('view') as View;
  
  return storedView ? storedView : 'Preview Generator';
}

function loadStoredEncryptedString(str: string): string {
  const ls = new SecureLS;
  return ls.get(str).data as string;
}


export const useAppStore = defineStore({
  id: 'appStore',
  state: () => ({

    prevOutputPath: loadStoredEncryptedString('prevOutputPath') as string,
    segOutputPath: loadStoredEncryptedString('segOutputPath') as string,
    segSuffix: loadStoredEncryptedString('segSuffix') as string,
    hypThumbOutputPath: loadStoredEncryptedString('hypThumbOutputPath') as string,
    transOutputPath: loadStoredEncryptedString('transOutputPath') as string,
    transMethod: loadStoredEncryptedString('transMethod') as string,
    conOutputPath: loadStoredEncryptedString('conOutputPath') as string,

    s3AccessKey: loadStoredEncryptedString('s3AccessKey') as string,
    s3BucketName: loadStoredEncryptedString('s3BucketName') as string,
    s3SecretKey: loadStoredEncryptedString('s3SecretKey') as string,
    selectedView: loadStoredView() as View,
    theme: loadStoredTheme(),
    trintApiKey: loadStoredEncryptedString('trintKey') as string,
  }),
  getters: {
    themeType(){
      if (this.theme === 'dark' || this.theme === 'dracula' || this.theme === 'aqua' || this.theme === 'forest' || this.theme === 'synthwave' 
          || this.theme === 'black' || this.theme === 'night'){
        return 'dark';
      } else {
        return 'light';
      }
    },
  },
  actions: {
    setSelectedView(newSelectedView: View){
      this.selectedView = newSelectedView;
      localStorage.setItem('view', newSelectedView);
    },
    setTheme(newTheme: string){
      this.theme = newTheme;
      localStorage.setItem('theme', this.theme);
    },
    setS3Data(s3BucketName: string, s3AccessKey: string, s3SecretKey: string) {
      // encrypt keys and save locally
      this.s3BucketName = s3BucketName;
      ls.set('s3BucketName', {data: s3BucketName});

      this.s3AccessKey = s3AccessKey;
      ls.set('s3AccessKey', {data: s3AccessKey});

      this.s3SecretKey = s3SecretKey;
      ls.set('s3SecretKey', {data: s3SecretKey});
    },
    setTrintKey(trintKey: string) {
      // encrypt key and save locally
      this.trintApiKey = trintKey;
      ls.set('trintKey', {data: trintKey});
    },
    setPrevOutputPath(path: string) {
      this.prevOutputPath = path;
      ls.set('prevOutputPath', {data: path});
    },
    setSegOutputPath(path: string) {
      this.segOutputPath = path;
      ls.set('segOutputPath', {data: path});
    },
    setSegSuffix(suffix: string) {
      this.segSuffix = suffix;
      ls.set('segSuffix', {data: suffix});
    },
    setHypThumbOutputPath(path: string) {
      this.hypThumbOutputPath = path;
      ls.set('hypThumbOutputPath', {data: path});
    },
    setTransOutputPath(path: string) {
      this.transOutputPath = path;
      ls.set('transOutputPath', {data: path});
    },
    setTransMethod(method: string) {
      this.transMethod = method;
      ls.set('transMethod', {data: method});
    },
    setConOutputPath(path: string) {
      this.conOutputPath = path;
      ls.set('conOutputPath', {data: path});
    }
  },
});