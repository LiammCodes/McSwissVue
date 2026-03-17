<template>
  <div class="flex flex-col h-full p-2" style="overflow-x: hidden;">
    <!-- Navbar -->
    <div class="navbar bg-primary rounded-box text-primary-content shrink-0 mb-2">
      <div class="flex-1 flex items-center gap-2 min-w-0">
        <!-- Add tool dropdown -->
        <div class="dropdown shrink-0">
          <label tabindex="0" class="btn btn-ghost btn-square" aria-label="Add tool">
            <plus-icon class="h-5 w-5" />
          </label>
          <ul tabindex="0" class="menu dropdown-content p-2 shadow bg-primary text-primary-content rounded-box w-52 mt-4 z-50">
            <li v-for="view in toolViews" :key="view">
              <a @click="handleAddTool(view)">{{ view }}</a>
            </li>
          </ul>
        </div>
        <!-- Tab bar -->
        <div class="flex gap-1 overflow-x-auto min-w-0 scrollbar-thin">
          <button
            v-for="tab in tabsStore.tabs"
            :key="tab.id"
            type="button"
            class="btn btn-sm shrink-0 gap-1"
            :class="tabsStore.activeTabId === tab.id && route.name === 'Workspace' ? 'btn-active' : 'btn-ghost'"
            @click="handleTabClick(tab.id)"
          >
            <span class="truncate max-w-[120px]">{{ tab.view }}</span>
            <span
              class="btn btn-ghost btn-xs btn-circle p-0 min-h-0 h-5 w-5 rounded-full hover:bg-primary-content/20"
              aria-label="Close tab"
              @click.stop="handleCloseTab(tab.id)"
            >
              <x-mark-icon class="h-3.5 w-3.5" />
            </span>
          </button>
        </div>
      </div>
      <div class="flex-none gap-1">
        <button
          type="button"
          class="btn btn-ghost btn-square relative"
          :class="{ 'btn-active': route.name === 'Settings' }"
          aria-label="Settings"
          @click="goToSettings"
        >
          <cog-6-tooth-icon class="h-5 w-5" />
          <span
            v-if="appStore.updateAvailable"
            class="absolute top-1 right-1 h-2 w-2 rounded-full bg-secondary ring-2 ring-primary"
            aria-hidden="true"
          />
        </button>
        <div class="dropdown dropdown-end">
          <label tabindex="0" class="btn btn-ghost gap-2">
            <swatch-icon class="h-5 w-5" />
            <span>Theme</span>
            <chevron-down-icon class="h-5 w-5" />
          </label>
          <ul tabindex="0" class="menu dropdown-content p-2 shadow bg-primary rounded-box w-52 mt-4 z-50">
            <li v-for="theme in THEMES" :key="theme" @click="appStore.setTheme(theme)">
              <a>{{ theme.charAt(0).toUpperCase() + theme.slice(1) }}</a>
            </li>
          </ul>
        </div>
      </div>
    </div>
    <!-- Page content -->
    <div class="flex-1 min-h-0 flex flex-col overflow-hidden">
      <slot name="tool-view"></slot>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useRoute } from 'vue-router';
import { SwatchIcon, ChevronDownIcon, Cog6ToothIcon, PlusIcon, XMarkIcon } from '@heroicons/vue/20/solid';
import { useAppStore } from '../stores/appStore';
import { useTabsStore } from '../stores/tabsStore';
import { View } from '../types/Types';
import { THEMES } from '../constants';

const TOOL_VIEWS: View[] = [
  'Preview Generator',
  'Segment Generator',
  'Hyper Thumbnail Generator',
  'Transcript Generator',
  'Transcript Editor',
  'Video Converter',
];

export default defineComponent({
  name: 'McNavbar',
  components: {
    ChevronDownIcon,
    Cog6ToothIcon,
    PlusIcon,
    SwatchIcon,
    XMarkIcon,
  },
  emits: ['theme-change'],
  setup() {
    const appStore = useAppStore();
    const tabsStore = useTabsStore();
    const route = useRoute();
    return { appStore, tabsStore, route, THEMES };
  },
  computed: {
    toolViews(): View[] {
      return TOOL_VIEWS;
    },
  },
  methods: {
    handleAddTool(view: View) {
      this.appStore.setSelectedView(view);
      this.tabsStore.addTab(view);
      if (this.route.name !== 'Workspace') {
        this.$router.push({ name: 'Workspace' });
      }
    },
    handleTabClick(tabId: string) {
      this.tabsStore.setActiveTab(tabId);
      if (this.route.name !== 'Workspace') {
        this.$router.push({ name: 'Workspace' });
      }
    },
    handleCloseTab(tabId: string) {
      this.tabsStore.closeTab(tabId);
      if (this.route.name === 'Workspace' && !this.tabsStore.hasTabs) {
        // Stay on workspace; empty state will show
      } else if (this.route.name === 'Workspace') {
        // Stay on workspace with new active tab
      }
    },
    goToSettings() {
      this.$router.push({ name: 'Settings' });
    },
  },
});
</script>
