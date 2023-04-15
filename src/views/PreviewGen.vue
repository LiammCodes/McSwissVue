<template>
  <mc-file-upload v-if="!filesUploaded" action="create previews for" />
  <mc-file-grid v-else/>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useAppStore } from '../stores/appStore';
import McFileUpload from '../components/McFileUpload.vue';
import McFileGrid from '../components/McFileGrid.vue';

export default defineComponent({
  components: { McFileUpload, McFileGrid },
  name: 'PreviewGen',
  setup() {
    const appStore = useAppStore();
    return { appStore }
  },
  data(){
    return {
      filesUploaded: false as boolean,
      files: [] as string[],
    }
  },
  mounted() {
    this.appStore.setSelectedTool('Preview Generator');
  }
});
</script>