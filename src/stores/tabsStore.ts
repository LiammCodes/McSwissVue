import { defineStore } from 'pinia';
import { View } from '../types/Types';

export type Tab = {
  id: string;
  view: View;
};

export type TranscriptEditorTabState = {
  videoPath: string;
  videoName: string;
  transcriptPath: string;
  transcriptName: string;
  currentTime: number;
  dirty: boolean;
  cues: Array<{
    index: number;
    startSeconds: number;
    endSeconds: number;
    text: string;
  }>;
};

function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useTabsStore = defineStore({
  id: 'tabsStore',
  state: () => ({
    tabs: [] as Tab[],
    activeTabId: null as string | null,
    /** Progress 0–100 when tool is running, null when idle. Keyed by tab id. */
    tabProgress: {} as Record<string, number | null>,
    transcriptEditorState: {} as Record<string, TranscriptEditorTabState | null>,
  }),
  getters: {
    activeTab(state): Tab | null {
      if (!state.activeTabId) return null;
      return state.tabs.find((t) => t.id === state.activeTabId) ?? null;
    },
    hasTabs(state): boolean {
      return state.tabs.length > 0;
    },
    progressForTab: (state) => (tabId: string): number | null => {
      return state.tabProgress[tabId] ?? null;
    },
  },
  actions: {
    setTabProgress(tabId: string, value: number | null) {
      if (value === null) {
        delete this.tabProgress[tabId];
      } else {
        this.tabProgress[tabId] = Math.min(100, Math.max(0, value));
      }
    },
    setTranscriptEditorState(tabId: string, value: TranscriptEditorTabState | null) {
      if (value === null) {
        delete this.transcriptEditorState[tabId];
      } else {
        this.transcriptEditorState[tabId] = value;
      }
    },
    getTranscriptEditorState(tabId: string): TranscriptEditorTabState | null {
      return this.transcriptEditorState[tabId] ?? null;
    },
    addTab(view: View): string {
      const id = generateTabId();
      const tab: Tab = { id, view };
      this.tabs.push(tab);
      this.activeTabId = id;
      return id;
    },
    closeTab(id: string) {
      delete this.tabProgress[id];
      delete this.transcriptEditorState[id];
      const index = this.tabs.findIndex((t) => t.id === id);
      if (index === -1) return;
      this.tabs.splice(index, 1);
      if (this.activeTabId === id) {
        if (this.tabs.length === 0) {
          this.activeTabId = null;
        } else {
          const nextIndex = Math.min(index, this.tabs.length - 1);
          this.activeTabId = this.tabs[nextIndex].id;
        }
      } else if (this.activeTabId) {
        const stillExists = this.tabs.some((t) => t.id === this.activeTabId);
        if (!stillExists) this.activeTabId = this.tabs[0]?.id ?? null;
      }
    },
    setActiveTab(id: string) {
      if (this.tabs.some((t) => t.id === id)) {
        this.activeTabId = id;
      }
    },
    ensureAtLeastOneTab(defaultView: View): void {
      if (this.tabs.length === 0) {
        this.addTab(defaultView);
      }
    },
  },
});
