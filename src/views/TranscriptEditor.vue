<template>
  <div class="flex flex-col flex-1 min-h-0 overflow-hidden">
    <!-- Drop zone: require one video + one transcript -->
    <div
      v-if="showDropZone"
      class="h-full w-full flex items-start justify-center mt-20"
      @dragover.prevent="handleDragOver"
      @drop.prevent="handleDrop"
    >
      <label
        class="flex flex-col justify-center items-center w-3/4 min-h-[280px] px-4 transition bg-base-100 border-2 border-base-content border-dashed rounded-box appearance-none cursor-pointer hover:border-primary focus:outline-none"
      >
        <span class="flex flex-col items-center space-y-2 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-10 h-10 text-base-content/60"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span class="font-medium">Drop a video and a transcript</span>
          <span class="text-sm text-base-content/70">
            Video: .mp4, .mov, .m4v — Transcript: .srt or .vtt
          </span>
          <span class="text-primary underline">or browse</span>
        </span>
        <input
          type="file"
          class="hidden"
          accept=".mp4,.mov,.m4v,.srt,.vtt"
          multiple
          @change="handleFileInput"
        />
      </label>
    </div>

    <template v-else>
      <div class="flex flex-col flex-1 min-h-0 overflow-hidden gap-2">
        <!-- Top: video + transcript list -->
        <div class="flex-1 min-h-0 grid grid-cols-3 gap-2 overflow-hidden">
          <!-- Video player -->
          <div class="col-span-2 flex flex-col bg-base-200 rounded-xl overflow-hidden">
            <div class="flex items-center justify-between px-2 py-1 bg-base-300">
              <span class="text-sm font-medium truncate">{{ videoFile?.name }}</span>
              <button
                type="button"
                class="btn btn-ghost btn-xs"
                @click="clearFiles"
              >
                Change files
              </button>
            </div>
            <div class="flex-1 min-h-0 flex items-center justify-center p-2 bg-black/20">
              <video
                ref="videoRef"
                class="max-w-full max-h-full object-contain rounded-lg"
                :src="videoObjectUrl"
                controls
                @timeupdate="onTimeUpdate"
                @loadedmetadata="onLoadedMetadata"
              />
            </div>
          </div>

          <!-- Cues list -->
          <div class="col-span-1 flex flex-col bg-base-200 rounded-xl overflow-hidden min-w-0">
            <div class="flex items-center justify-between px-2 py-1 bg-base-300 shrink-0">
              <span class="text-sm font-medium truncate">{{ transcriptFile?.name }}</span>
              <button
                type="button"
                class="btn btn-primary btn-xs"
                :disabled="saving"
                @click="saveTranscript"
              >
                {{ saving ? 'Saving…' : 'Save' }}
              </button>
            </div>
            <div ref="cueList" class="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
              <div
                v-for="(cue, idx) in cues"
                :key="idx"
                :data-cue-index="idx"
                class="rounded-lg border transition-colors"
                :class="currentCueIndex === idx ? 'border-primary bg-primary/10' : 'border-base-300 bg-base-100'"
              >
                <div
                  class="flex items-center gap-2 px-2 py-1 text-xs text-base-content/70 border-b border-base-200"
                >
                  <span>{{ formatTime(cue.startSeconds) }} → {{ formatTime(cue.endSeconds) }}</span>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs ml-auto"
                    title="Seek to cue"
                    @click="seekTo(cue.startSeconds)"
                  >
                    Play
                  </button>
                </div>
                <textarea
                  v-model="cue.text"
                  class="textarea textarea-ghost w-full min-h-[4rem] text-sm resize-none focus:outline-none border-0"
                  placeholder="Subtitle text"
                  @input="markDirty"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Toast for save / errors -->
        <p v-if="saveMessage" class="text-sm text-center" :class="saveError ? 'text-error' : 'text-success'">
          {{ saveMessage }}
        </p>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import {
  parseSubtitle,
  serializeSubtitle,
  type SubtitleCue,
} from '../utils/subtitleUtils';
import { getFilePath } from '../utils/electronFilePath';

const VIDEO_EXT = ['.mp4', '.mov', '.m4v'];
const TRANSCRIPT_EXT = ['.srt', '.vtt'];

function getExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i).toLowerCase();
}

function isVideo(file: File): boolean {
  return VIDEO_EXT.includes(getExt(file.name));
}

function isTranscript(file: File): boolean {
  return TRANSCRIPT_EXT.includes(getExt(file.name));
}

export default defineComponent({
  name: 'TranscriptEditor',
  emits: ['toggle-toast'],
  setup() {
    const fs = require('fs');
    return { fs };
  },
  data() {
    return {
      videoFile: null as File | null,
      transcriptFile: null as File | null,
      transcriptPath: '' as string,
      cues: [] as SubtitleCue[],
      currentTime: 0,
      saving: false,
      saveMessage: '',
      saveError: false,
      dirty: false,
      videoObjectUrl: '' as string,
    };
  },
  computed: {
    showDropZone(): boolean {
      return !this.videoFile || !this.transcriptFile;
    },
    currentCueIndex(): number {
      const t = this.currentTime;
      const idx = this.cues.findIndex((c) => t >= c.startSeconds && t < c.endSeconds);
      return idx === -1 ? -1 : idx;
    },
  },
  watch: {
    currentCueIndex(idx) {
      if (idx >= 0) {
        this.$nextTick(() => {
          const list = this.$refs.cueList as HTMLElement | undefined;
          const el = list?.querySelector(`[data-cue-index="${idx}"]`);
          el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
      }
    },
  },
  beforeUnmount() {
    if (this.videoObjectUrl) {
      URL.revokeObjectURL(this.videoObjectUrl);
    }
  },
  methods: {
    handleDragOver(e: DragEvent) {
      e.preventDefault();
    },
    handleDrop(e: DragEvent) {
      e.preventDefault();
      const files = Array.from(e.dataTransfer?.files || []);
      this.applyFiles(files);
    },
    handleFileInput(e: Event) {
      const input = e.target as HTMLInputElement;
      if (input.files) this.applyFiles(Array.from(input.files));
      input.value = '';
    },
    applyFiles(files: File[]) {
      const video = files.find(isVideo);
      const transcript = files.find(isTranscript);
      if (!video || !transcript) {
        this.$emit('toggle-toast', {
          message: 'Please add one video (.mp4, .mov, .m4v) and one transcript (.srt or .vtt).',
          kind: 'alert-error',
          timeout: 4000,
        });
        return;
      }
      if (this.videoObjectUrl) URL.revokeObjectURL(this.videoObjectUrl);
      this.videoFile = video;
      this.transcriptFile = transcript;
      this.transcriptPath = getFilePath(transcript) || '';
      this.videoObjectUrl = URL.createObjectURL(video);
      this.loadTranscript();
      this.dirty = false;
      this.saveMessage = '';
    },
    clearFiles() {
      if (this.videoObjectUrl) {
        URL.revokeObjectURL(this.videoObjectUrl);
        this.videoObjectUrl = '';
      }
      this.videoFile = null;
      this.transcriptFile = null;
      this.transcriptPath = '';
      this.cues = [];
      this.saveMessage = '';
      this.dirty = false;
    },
    loadTranscript() {
      if (!this.transcriptFile) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = (reader.result as string) || '';
        this.cues = parseSubtitle(text, this.transcriptFile!.name);
      };
      reader.readAsText(this.transcriptFile, 'utf-8');
    },
    onTimeUpdate() {
      const video = this.$refs.videoRef as HTMLVideoElement;
      if (video) this.currentTime = video.currentTime;
    },
    onLoadedMetadata() {
      const video = this.$refs.videoRef as HTMLVideoElement;
      if (video) this.currentTime = video.currentTime;
    },
    seekTo(seconds: number) {
      const video = this.$refs.videoRef as HTMLVideoElement;
      if (video) {
        video.currentTime = seconds;
        this.currentTime = seconds;
      }
    },
    formatTime(seconds: number): string {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      const ms = Math.round((seconds % 1) * 1000);
      return [h, m, s].map((x) => String(x).padStart(2, '0')).join(':') + '.' + String(ms).padStart(3, '0');
    },
    markDirty() {
      this.dirty = true;
      this.saveMessage = '';
    },
    async saveTranscript() {
      if (!this.transcriptFile || this.cues.length === 0) return;
      const path = getFilePath(this.transcriptFile);
      if (!path) {
        this.saveMessage = 'Cannot save: transcript file path unknown.';
        this.saveError = true;
        return;
      }
      this.saving = true;
      this.saveMessage = '';
      this.saveError = false;
      try {
        const out = serializeSubtitle(this.cues, this.transcriptFile.name);
        this.fs.writeFileSync(path, out, 'utf-8');
        this.saveMessage = 'Saved.';
        this.saveError = false;
        this.dirty = false;
      } catch (e: any) {
        this.saveMessage = e?.message || 'Save failed.';
        this.saveError = true;
      } finally {
        this.saving = false;
      }
    },
  },
});
</script>

<style scoped>
textarea:focus {
  outline: none;
}
</style>
