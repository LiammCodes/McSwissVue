import { defineStore } from 'pinia';
import { Tool } from '../types/Tool';

function loadStoredTheme(): string {
  const storedTheme = localStorage.getItem('theme');
  return storedTheme ? JSON.parse(storedTheme).storedTheme : 'dark';
}

function loadStoredTool(): Tool {
  const storedTool = localStorage.getItem('tool');
  return storedTool ? JSON.parse(storedTool).storedTool : 'Preview Generator';
}

export const useAppStore = defineStore({
  id: 'appStore',
  state: () => ({
    selectedTool: loadStoredTool() as Tool,
    theme: loadStoredTheme() as string,
  }),
  getters: {
    themeType(){
      if (this.theme === 'dark' || this.theme === 'forest' || this.theme === 'synthwave' 
          || this.theme === 'black' || this.theme === 'night'){
        return 'dark';
      } else {
        return 'light';
      }
    }
  },
  actions: {
    setSelectedTool(newSelectedTool: Tool){
      this.selectedTool = newSelectedTool;
      localStorage.setItem('tool', JSON.stringify({ storedTool: newSelectedTool }));
    },
    setTheme(newTheme: string){
      this.theme = newTheme;
      localStorage.setItem('theme', JSON.stringify({ storedTheme: newTheme }));
    },
  },
});