<template>
  <mc-file-upload v-if="showFileUpload" action="create segments for" @files-uploaded="handleFilesUploaded" />
  <mc-file-grid v-else :files="files" />
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useAppStore } from '../stores/appStore';
import McFileUpload from '../components/McFileUpload.vue';
import McFileGrid from '../components/McFileGrid.vue';

export default defineComponent({
  components: { McFileUpload, McFileGrid },
  name: 'SegmentGen',
  setup() {
    const appStore = useAppStore();
    return { appStore };
    
  },
  data() {
    return {
      showFileUpload: true,
      files: ref<File[]>([])
    }
  },
  mounted() {
    this.appStore.setSelectedTool('Segment Generator');
  },
  methods: {
    handleFilesUploaded(uploadedFiles: File[]){
      this.files.push(...uploadedFiles);
      this.showFileUpload = false;
    }
  }
});
</script>