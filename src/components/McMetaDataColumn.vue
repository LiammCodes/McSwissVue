<template>
  <div v-if="filesLoading || !selectedFile" class="flex items-center justify-center h-full w-full">
    <span class="loading loading-dots text-secondary loading-lg"></span>
  </div>
  <div v-else class="gap-4 bg-base-200 rounded-t-xl">
    <div v-if="selectedFile.thumbnailPath !== ''">
      <img :src="selectedFile.thumbnailPath" alt="Thumbnail for selected file" class="rounded-t-xl object-cover"/>
    </div>
    <div class="p-3">
      <p class="text-base font-bold" style="word-break: break-all;">{{ selectedFile.file!.name }}</p>
      <div class="bg-base-100 rounded-md text-sm p-2 space-y-3 mt-3">
        <p>Duration: <span class="float-right">{{ fileDuration }}</span></p>
        <p>Size: <span class="float-right">{{ fileSize }}</span></p>
        <p>Bitrate: <span class="float-right">{{ fileBitrate }}</span></p>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { FileData } from '../types/Types';

export default defineComponent({
  name: 'McMetaDataColumn',
  props: {
    filesLoading: Boolean,
    selectedFile: Object as PropType<FileData>
  },
  mounted() {
    
  },
  computed: {
    fileBitrate(): string {
      if (this.selectedFile) {
        return this.selectedFile.duration
      } else {
        return 'Err :('
      }
    },
    fileDuration(): string {
      if (this.selectedFile) {
        return this.selectedFile.bitrate
      } else {
        return 'Err :('
      }
    },
    fileSize(): string {
      if (this.selectedFile) {
        return this.formatedFileSize(+this.selectedFile.file!.size)
      } else {
        return 'Err :('
      }
    }
  },
  methods: {
    formatedFileSize(bytes: number): string {
      if (bytes < 1024) {
        return bytes + ' B';
      } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + ' KB';
      } else if (bytes < 1024 * 1024 * 1024) {
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
      } else {
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
      }
    },
  }

});
</script>