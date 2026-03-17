<template>
  <div class="flex flex-col gap-4 bg-base-200 rounded-t-xl h-full min-h-0">
    <!-- Thumbnail or placeholder -->
    <div v-if="selectedFile?.thumbnailPath" class="shrink-0">
      <img :src="selectedFile.thumbnailPath" alt="Thumbnail for selected file" class="rounded-t-xl object-cover w-full"/>
    </div>
    <div v-else class="shrink-0 flex items-center justify-center rounded-t-xl bg-base-300 aspect-video w-full text-base-content/30">
      <PhotoIcon class="w-16 h-16" />
    </div>
    <div class="p-3 min-w-0 flex-1">
      <p class="text-base font-bold truncate" style="word-break: break-all;">{{ fileName }}</p>
      <div class="bg-base-100 rounded-md text-sm p-2 space-y-3 mt-3">
        <p>Duration: <span class="float-right">{{ fileDuration }}</span></p>
        <p>Size: <span class="float-right">{{ fileSize }}</span></p>
        <p>Bitrate: <span class="float-right">{{ fileBitrate }}</span></p>
        <p>Resolution: <span class="float-right">{{ fileResolution || '—' }}</span></p>
        <p>Frame rate: <span class="float-right">{{ fileFrameRate }}</span></p>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { PhotoIcon } from '@heroicons/vue/24/outline';
import { FileData } from '../types/Types';

export default defineComponent({
  name: 'McMetaDataColumn',
  components: { PhotoIcon },
  props: {
    filesLoading: Boolean,
    selectedFile: Object as PropType<FileData>
  },
  computed: {
    fileName(): string {
      return this.selectedFile?.file?.name ?? '';
    },
    fileBitrate(): string {
      if (this.selectedFile?.bitrate) {
        return this.selectedFile.bitrate;
      }
      return '—';
    },
    fileDuration(): string {
      if (this.selectedFile?.duration) {
        return this.selectedFile.duration;
      }
      return '—';
    },
    fileSize(): string {
      if (this.selectedFile?.file?.size != null) {
        return this.formattedFileSize(+this.selectedFile.file.size);
      }
      return '—';
    },
    fileResolution(): string {
      if (this.selectedFile && this.selectedFile.width > 0 && this.selectedFile.height > 0) {
        return `${this.selectedFile.width} × ${this.selectedFile.height}`;
      }
      return '';
    },
    fileFrameRate(): string {
      const fps = this.selectedFile?.frameRate;
      if (fps == null || !Number.isFinite(fps) || fps <= 0) return '—';
      // Trim trailing zeros for integers, keep common fractional rates readable.
      const s = String(fps);
      return s.includes('.') ? s.replace(/\.?0+$/, '') + ' fps' : s + ' fps';
    }
  },
  methods: {
    formattedFileSize(bytes: number): string {
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