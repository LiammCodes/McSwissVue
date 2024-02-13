<template>
  <mc-file-upload v-if="showFileUpload" action="create segments for" @files-uploaded="handleFilesUploaded" />
  <div v-else class="m-2 h-full" style="overflow-x: hidden;">
    <div class="grid grid-cols-8 gap-2 h-full">
      <mc-file-grid class="col-span-4" :files="files" @file-selected="handleFileSelected" @files-loaded="handleFilesLoaded">
        <template v-slot:spacing>
          <div class="h-full"></div>
        </template>
      </mc-file-grid>
      <div class="col-span-2 flex flex-wrap gap-2 justify-start items-start bg-base-200 rounded-xl p-2" style="height:100%">
        <div class="h-full">
          <mc-segment></mc-segment>
        </div>
      </div>
      <!-- METADATA COL -->
      <div class="col-span-2 gap-2 bg-base-200 rounded-xl">
        <mc-meta-data-column :files-loading="filesLoading" :selected-file="selectedFile" />
      </div>
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
import { FileData, Segment } from '../types/Types';
import { 
  fileAlreadyExists,
  getSeconds,
  getShortestVideoDuration,
  parseFFmpegProgress,
  removeExtension
} from '../utils/HelperFunctions';
import McFileUpload from '../components/McFileUpload.vue';
import McFileGrid from '../components/McFileGrid.vue';
import McSegment from '../components/McSegment.vue';
import McBinaryModal from '../components/modals/McBinaryModal.vue';
import TimeInput from '../components/TimeInput.vue';
import McMetaDataColumn from '../components/McMetaDataColumn.vue';

export default defineComponent({
  name: 'SegmentGen',
  components: { McBinaryModal, McFileUpload, McFileGrid, McMetaDataColumn, McSegment, TimeInput },
  setup() {
    const appStore = useAppStore();
    return { appStore };
  },
  data() {
    return {
      files: ref<File[]>([]),
      filesLoading: true as boolean,
      selectedFile: {
        bitrate: '' as string,
        duration: '' as string,
        file: null as null | File,
        thumbnailPath: '' as string
      } as FileData,
      segments: [{
        startTime: '00:00:00',
        endTime: '00:00:00',
      }] as Segment[],
      shortestDuration: null as null | number,
      showFileUpload: true as boolean,
      successToastMessage: '' as string,
    }
  },
  mounted() {
    this.appStore.setSelectedTool('Segment Generator');
  },
  methods: {
    handleFilesUploaded(uploadedFiles: File[]){
      this.files.push(...uploadedFiles);
      this.showFileUpload = false;
      this.selectedFile.file = this.files[0];
    },

    getShortestVideoDuration,

    handleFilesLoaded(fileObjects: object[]) {
      this.filesLoading = false
      this.setSuccessToastMsg(this.segments.length)
      
      // get shortest video durration
      // (this will set the maximum allowed preview durration)
      this.shortestDuration = getShortestVideoDuration(fileObjects);
    },

    handleFileSelected(file: any) {
      this.selectedFile = file;
    },

    setSuccessToastMsg(numFiles: number) {
      if (numFiles === 1) {
        this.successToastMessage = numFiles + ' Segment Generated Successfully  🎉'
      } 
      else {
        this.successToastMessage = numFiles + ' Segments Generated Successfully  🎉'
      }
    },

  }
});
</script>