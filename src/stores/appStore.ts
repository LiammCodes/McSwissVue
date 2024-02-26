import { defineStore } from 'pinia';
import { View } from '../types/Types';

function loadStoredTheme(): string {
  const storedTheme = localStorage.getItem('theme');
  return storedTheme ? JSON.parse(storedTheme).storedTheme : 'dark';
}

function loadStoredView(): View {
  const storedView = localStorage.getItem('view');
  return storedView ? JSON.parse(storedView).storedView : 'Preview Generator';
}

export const useAppStore = defineStore({
  id: 'appStore',
  state: () => ({
    selectedView: loadStoredView() as View,
    theme: loadStoredTheme(),
  }),
  getters: {
    themeType(){
      if (this.theme === 'dark' || this.theme === 'aqua' || this.theme === 'forest' || this.theme === 'synthwave' 
          || this.theme === 'black' || this.theme === 'night'){
        return 'dark';
      } else {
        return 'light';
      }
    }
  },
  actions: {
    setSelectedView(newSelectedView: View){
      this.selectedView = newSelectedView;
      localStorage.setItem('view', JSON.stringify({ storedView: newSelectedView }));
    },
    setTheme(newTheme: string){
      this.theme = newTheme;
      localStorage.setItem('theme', JSON.stringify({ storedTheme: newTheme }));
    },
  },
});