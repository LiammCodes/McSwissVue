<template>
  <div class="flex flex-col h-full p-2" style="overflow-x: hidden;">
    <!-- Navbar -->
    <div class="navbar bg-primary rounded-box text-primary-content shrink-0 mb-2">
      <div class="flex-1">
        <div class="dropdown">
          <label tabindex="0" class="btn btn-ghost text-lg font-bold gap-1">
            {{ currentViewName }}
            <chevron-down-icon class="h-5 w-5" />
          </label>
          <ul tabindex="0" class="menu dropdown-content p-2 shadow bg-primary text-primary-content rounded-box w-52 mt-4 z-50">
            <li v-for="view in toolViews" :key="view">
              <a @click="handleNavClick(view)" :class="{ 'active': currentViewName === view }">{{ view }}</a>
            </li>
          </ul>
        </div>
      </div>
      <div class="flex-none gap-1">
        <button
          type="button"
          class="btn btn-ghost btn-square"
          :class="{ 'btn-active': currentViewName === views.settings }"
          :aria-label="views.settings"
          @click="handleNavClick(views.settings)"
        >
          <cog-6-tooth-icon class="h-5 w-5" />
        </button>
        <div class="dropdown dropdown-end">
          <label tabindex="0" class="btn btn-ghost gap-2">
            <swatch-icon class="h-5 w-5" />
            <span>Theme</span>
            <chevron-down-icon class="h-5 w-5" />
          </label>
          <ul tabindex="0" class="menu dropdown-content p-2 shadow bg-primary rounded-box w-52 mt-4 z-50">
            <li @click="appStore.setTheme('dark')"><a>Dark</a></li>
            <li @click="appStore.setTheme('light')"><a>Light</a></li>
            <li @click="appStore.setTheme('aqua')"><a>Aqua</a></li>
            <li @click="appStore.setTheme('cupcake')"><a>Cupcake</a></li>
            <li @click="appStore.setTheme('dracula')"><a>Dracula</a></li>
            <li @click="appStore.setTheme('forest')"><a>Forest</a></li>
            <li @click="appStore.setTheme('night')"><a>Night</a></li>
            <li @click="appStore.setTheme('synthwave')"><a>Synthwave</a></li>
            <li @click="appStore.setTheme('winter')"><a>Winter</a></li>
          </ul>
        </div>
      </div>
    </div>
    <!-- Page content: flex column so views can pin generate card to bottom -->
    <div class="flex-1 min-h-0 flex flex-col overflow-hidden">
      <slot name="tool-view"></slot>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { SwatchIcon, ChevronDownIcon, Cog6ToothIcon } from '@heroicons/vue/20/solid';
import { useAppStore } from '../stores/appStore';
import { View } from '../types/Types';

const TOOL_VIEWS: View[] = [
  'Preview Generator',
  'Segment Generator',
  'Hyper Thumbnail Generator',
  'Transcript Generator',
  'Video Converter',
];

export default defineComponent({
  name: 'McNavbar',
  components: {
    ChevronDownIcon,
    Cog6ToothIcon,
    SwatchIcon,
  },
  emits: ['theme-change'],
  setup() {
    const appStore = useAppStore();
    const route = useRoute();

    const currentViewName = computed(() => {
      const name = route.name as string | undefined;
      if (name && isValidView(name)) return name;
      return appStore.selectedView;
    });

    return { appStore, currentViewName, route };
  },
  data() {
    return {
      views: {
        settings: 'Settings' as View,
      },
    };
  },
  computed: {
    toolViews(): View[] {
      return TOOL_VIEWS;
    },
  },
  watch: {
    '$route.name'(name: string | undefined) {
      if (name && isValidView(name)) {
        this.appStore.setSelectedView(name as View);
      }
    },
  },
  methods: {
    handleNavClick(view: View) {
      this.appStore.setSelectedView(view);
      this.$router.push({ name: view });
    },
  },
});

function isValidView(name: string): name is View {
  const views: View[] = [
    'Preview Generator',
    'Segment Generator',
    'Thumbnail Generator',
    'Hyper Thumbnail Generator',
    'Transcript Generator',
    'Video Converter',
    'Settings',
  ];
  return views.includes(name as View);
}
</script>
