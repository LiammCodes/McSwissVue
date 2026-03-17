<template>
  <div class="flex flex-col flex-1 min-h-0 overflow-hidden">
    <!-- Empty state when no tabs -->
    <div
      v-if="!tabsStore.hasTabs"
      class="flex-1 flex flex-col items-center justify-center gap-4 text-base-content/70"
    >
      <p class="text-lg">No tools open</p>
      <p class="text-sm">Click <strong>+</strong> in the navbar to add a tool</p>
    </div>
    <!-- Tab panels: only one visible, all kept alive so state persists -->
    <template v-else>
      <div
        v-for="tab in tabsStore.tabs"
        :key="tab.id"
        class="flex-1 min-h-0 flex flex-col overflow-hidden"
        :class="{ 'hidden': tabsStore.activeTabId !== tab.id }"
      >
        <keep-alive>
          <component
            :is="viewComponent(tab.view)"
            :key="tab.id"
            @toggle-toast="$emit('toggle-toast', $event)"
          />
        </keep-alive>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, type Component } from 'vue';
import { useTabsStore } from '../stores/tabsStore';
import { View } from '../types/Types';
import PreviewGen from './PreviewGen.vue';
import SegmentGen from './SegmentGen.vue';
import HyperThumbnailGen from './HyperThumbnailGen.vue';
import TranscriptGenerator from './TranscriptGenerator.vue';
import TranscriptEditor from './TranscriptEditor.vue';
import VideoConverter from './VideoConverter.vue';

const VIEW_COMPONENTS: Record<View, Component> = {
  'Preview Generator': PreviewGen,
  'Segment Generator': SegmentGen,
  'Thumbnail Generator': HyperThumbnailGen,
  'Hyper Thumbnail Generator': HyperThumbnailGen,
  'Transcript Generator': TranscriptGenerator,
  'Transcript Editor': TranscriptEditor,
  'Video Converter': VideoConverter,
  'Settings': null as unknown as Component, // not rendered as tab
};

export default defineComponent({
  name: 'WorkspaceView',
  components: {
    PreviewGen,
    SegmentGen,
    HyperThumbnailGen,
    TranscriptGenerator,
    TranscriptEditor,
    VideoConverter,
  },
  emits: ['toggle-toast'],
  setup() {
    const tabsStore = useTabsStore();
    return { tabsStore };
  },
  methods: {
    viewComponent(view: View): Component {
      const c = VIEW_COMPONENTS[view];
      return c ?? PreviewGen;
    },
  },
});
</script>
