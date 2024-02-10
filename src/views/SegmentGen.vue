<template>
  <mc-file-upload v-if="showFileUpload" action="create segments for" @files-uploaded="handleFilesUploaded" />
  <div v-else class="m-2 h-full" style="overflow-x: hidden;">
    <div class="grid grid-cols-4 gap-2 h-full">
      <mc-file-grid :files="files" class="col-span-3" />
      <div class="col-span-1 flex flex-wrap gap-2 justify-start items-start bg-base-200 rounded-xl p-2" style="height:100%">
        <div class="h-full">
          <mc-segment></mc-segment>
        </div>
       
      </div>
      <!-- <div class="col-span-1 gap-2 bg-base-200 rounded-xl"></div> -->
    </div>
  </div>
  <div v-if="!showFileUpload" class="flex justify-between items-center gap-10 bg-base-200 rounded-xl p-3 bottom-0 mx-2">
    <div class="space-y-2">
      <div class="flex justify-end items-center space-x-2">
        <span>Start timestamp: </span><input type="text" placeholder="00:00" class="input input-sm w-24 focus:outline-none" />
      </div>
      <div class="flex justify-end items-center space-x-2">
        <span>End timestamp: </span><input type="text" placeholder="00:00" class="input input-sm w-24 focus:outline-none" />
      </div>    
    </div>
    <div class="space-y-2 flex-grow max-w-md">
      <div class="flex justify-end items-center space-x-2">
        <span>Output: </span><input type="text" placeholder="None" class="input input-sm w-full border focus:outline-none" /><label class="btn btn-sm btn-ghost border border-base-content">browse</label>
      </div>  
    </div>
    <label class="btn btn-primary">
      generate
    </label>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useAppStore } from '../stores/appStore';
import McFileUpload from '../components/McFileUpload.vue';
import McFileGrid from '../components/McFileGrid.vue';
import McSegment from '../components/McSegment.vue';

export default defineComponent({
  components: { McFileUpload, McFileGrid, McSegment },
  name: 'SegmentGen',
  setup() {
    const appStore = useAppStore();
    return { appStore };
  },
  data() {
    return {
      files: ref<File[]>([]),
      showFileUpload: true as boolean,
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