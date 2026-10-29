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
              <span class="text-sm font-medium truncate">{{ videoFile?.name || videoName }}</span>
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
            <div class="flex items-center justify-between gap-2 px-2 py-1 bg-base-300 shrink-0">
              <span class="text-sm font-medium truncate min-w-0">{{ transcriptFile?.name || transcriptName }}</span>
              <button
                type="button"
                class="btn btn-primary btn-xs shrink-0"
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
                  class="flex items-center gap-1 px-2 py-1 text-xs text-base-content/70 border-b border-base-200"
                >
                  <input
                    type="text"
                    class="input input-xs flex-1 min-w-0 px-1 font-mono text-center"
                    title="Start time (HH:MM:SS.mmm)"
                    :value="timeInputDisplay(idx, 'start')"
                    @focus="beginTimeEdit(idx, 'start')"
                    @input="onTimeEditInput($event)"
                    @blur="commitTimeEdit"
                    @keydown.enter.prevent="blurTimeInput($event)"
                  />
                  <span class="opacity-60 shrink-0">→</span>
                  <input
                    type="text"
                    class="input input-xs flex-1 min-w-0 px-1 font-mono text-center"
                    title="End time (HH:MM:SS.mmm)"
                    :value="timeInputDisplay(idx, 'end')"
                    @focus="beginTimeEdit(idx, 'end')"
                    @input="onTimeEditInput($event)"
                    @blur="commitTimeEdit"
                    @keydown.enter.prevent="blurTimeInput($event)"
                  />
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs shrink-0 hover:btn-error"
                    title="Remove this cue"
                    @click="removeCue(idx)"
                  >
                    ×
                  </button>
                </div>
                <textarea
                  v-model="cue.text"
                  class="textarea textarea-ghost w-full min-h-[4rem] text-sm resize-none focus:outline-none border-0"
                  placeholder="Subtitle text"
                  @input="markDirty"
                />
                <div
                  class="flex items-center gap-1 px-2 py-1 border-t border-base-200"
                >
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs"
                    title="Seek to cue"
                    @click="seekTo(cue.startSeconds)"
                  >
                    Play
                  </button>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs ml-auto"
                    title="Insert a cue after this one (uses the gap to the next cue)"
                    @click="addCueAfter(idx)"
                  >
                    +
                  </button>
                </div>
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
  parseSubtitleTime,
  serializeSubtitle,
  type SubtitleCue,
} from '../utils/subtitleUtils';
import { getFilePath } from '../utils/electronFilePath';
import { useTabsStore } from '../stores/tabsStore';

type TimeEditField = 'start' | 'end';
type TimeEditState = { idx: number; field: TimeEditField; value: string };

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
  props: {
    tabId: { type: String, default: null },
  },
  setup() {
    const fs = require('fs');
    const tabsStore = useTabsStore();
    const pathToFileURL = require('url').pathToFileURL as (p: string) => URL;
    return { fs, tabsStore, pathToFileURL };
  },
  data() {
    return {
      videoFile: null as File | null,
      videoPath: '' as string,
      videoName: '' as string,
      transcriptFile: null as File | null,
      transcriptPath: '' as string,
      transcriptName: '' as string,
      cues: [] as SubtitleCue[],
      currentTime: 0,
      saving: false,
      saveMessage: '',
      saveError: false,
      dirty: false,
      videoObjectUrl: '' as string,
      editingTime: null as TimeEditState | null,
    };
  },
  computed: {
    showDropZone(): boolean {
      return !this.videoObjectUrl || !this.transcriptPath;
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
  mounted() {
    this.restoreState();
  },
  beforeUnmount() {
    this.persistState();
    if (this.videoObjectUrl) {
      URL.revokeObjectURL(this.videoObjectUrl);
    }
  },
  methods: {
    toFileUrl(path: string): string {
      if (!path) return '';
      try {
        return this.pathToFileURL(path).toString();
      } catch {
        return '';
      }
    },
    persistState() {
      if (!this.tabId) return;
      if (!this.videoPath || !this.transcriptPath || this.cues.length === 0) {
        this.tabsStore.setTranscriptEditorState(this.tabId, null);
        return;
      }
      this.tabsStore.setTranscriptEditorState(this.tabId, {
        videoPath: this.videoPath,
        videoName: this.videoName,
        transcriptPath: this.transcriptPath,
        transcriptName: this.transcriptName,
        currentTime: this.currentTime,
        dirty: this.dirty,
        cues: this.cues.map((cue, index) => ({
          index: cue.index ?? index + 1,
          startSeconds: cue.startSeconds,
          endSeconds: cue.endSeconds,
          text: cue.text,
        })),
      });
    },
    restoreState() {
      if (!this.tabId) return;
      const state = this.tabsStore.getTranscriptEditorState(this.tabId);
      if (!state) return;
      this.videoPath = state.videoPath;
      this.videoName = state.videoName;
      this.transcriptPath = state.transcriptPath;
      this.transcriptName = state.transcriptName;
      this.currentTime = state.currentTime;
      this.dirty = state.dirty;
      this.cues = state.cues.map((cue, idx) => ({
        index: cue.index ?? idx + 1,
        startSeconds: cue.startSeconds,
        endSeconds: cue.endSeconds,
        text: cue.text,
      }));
      this.videoObjectUrl = this.toFileUrl(this.videoPath);
    },
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
      this.videoPath = getFilePath(video) || '';
      this.videoName = video.name;
      this.transcriptFile = transcript;
      this.transcriptPath = getFilePath(transcript) || '';
      this.transcriptName = transcript.name;
      this.videoObjectUrl = URL.createObjectURL(video);
      this.loadTranscript();
      this.dirty = false;
      this.saveMessage = '';
      this.persistState();
    },
    clearFiles() {
      if (this.videoObjectUrl) {
        URL.revokeObjectURL(this.videoObjectUrl);
        this.videoObjectUrl = '';
      }
      this.videoFile = null;
      this.videoPath = '';
      this.videoName = '';
      this.transcriptFile = null;
      this.transcriptPath = '';
      this.transcriptName = '';
      this.cues = [];
      this.saveMessage = '';
      this.dirty = false;
      this.currentTime = 0;
      this.persistState();
    },
    loadTranscript() {
      if (!this.transcriptFile) {
        if (!this.transcriptPath) return;
        const text = this.fs.readFileSync(this.transcriptPath, 'utf-8');
        this.cues = parseSubtitle(text, this.transcriptName || this.transcriptPath);
        this.persistState();
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const text = (reader.result as string) || '';
        this.cues = parseSubtitle(text, this.transcriptFile!.name);
        this.persistState();
      };
      reader.readAsText(this.transcriptFile, 'utf-8');
    },
    onTimeUpdate() {
      const video = this.$refs.videoRef as HTMLVideoElement;
      if (video) {
        this.currentTime = video.currentTime;
        this.persistState();
      }
    },
    onLoadedMetadata() {
      const video = this.$refs.videoRef as HTMLVideoElement;
      if (video) {
        if (this.currentTime > 0) {
          video.currentTime = this.currentTime;
        } else {
          this.currentTime = video.currentTime;
        }
      }
    },
    seekTo(seconds: number) {
      const video = this.$refs.videoRef as HTMLVideoElement;
      if (video) {
        video.currentTime = seconds;
        this.currentTime = seconds;
        this.persistState();
      }
    },
    formatTime(seconds: number): string {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      const ms = Math.round((seconds % 1) * 1000);
      return [h, m, s].map((x) => String(x).padStart(2, '0')).join(':') + '.' + String(ms).padStart(3, '0');
    },
    timeInputDisplay(idx: number, field: TimeEditField): string {
      if (this.editingTime?.idx === idx && this.editingTime.field === field) {
        return this.editingTime.value;
      }
      const cue = this.cues[idx];
      if (!cue) return '00:00:00.000';
      return this.formatTime(field === 'start' ? cue.startSeconds : cue.endSeconds);
    },
    beginTimeEdit(idx: number, field: TimeEditField) {
      const cue = this.cues[idx];
      if (!cue) return;
      this.editingTime = {
        idx,
        field,
        value: this.formatTime(field === 'start' ? cue.startSeconds : cue.endSeconds),
      };
    },
    onTimeEditInput(e: Event) {
      if (!this.editingTime) return;
      this.editingTime = {
        ...this.editingTime,
        value: (e.target as HTMLInputElement).value,
      };
    },
    blurTimeInput(e: Event) {
      (e.target as HTMLInputElement).blur();
    },
    commitTimeEdit() {
      if (!this.editingTime) return;
      const { idx, field, value } = this.editingTime;
      this.editingTime = null;
      const cue = this.cues[idx];
      if (!cue) return;

      const trimmed = value.trim();
      if (!trimmed) return;
      if (!/^(?:\d{1,3}:)?\d{1,2}:\d{1,2}(?:[,.]\d{1,3})?$/.test(trimmed)) {
        this.$emit('toggle-toast', {
          message: 'Invalid timestamp. Use HH:MM:SS.mmm',
          kind: 'alert-error',
          timeout: 3000,
        });
        return;
      }
      const seconds = parseSubtitleTime(trimmed);
      if (!Number.isFinite(seconds) || seconds < 0) {
        this.$emit('toggle-toast', {
          message: 'Invalid timestamp. Use HH:MM:SS.mmm',
          kind: 'alert-error',
          timeout: 3000,
        });
        return;
      }

      if (field === 'start') {
        cue.startSeconds = seconds;
        if (cue.endSeconds <= cue.startSeconds) {
          cue.endSeconds = cue.startSeconds + 0.5;
        }
      } else {
        cue.endSeconds = Math.max(seconds, cue.startSeconds + 0.001);
      }
      this.markDirty();
    },
    reindexCues() {
      this.cues.forEach((cue, i) => {
        cue.index = i + 1;
      });
    },
    insertCueAt(insertAt: number, startSeconds: number, endSeconds: number) {
      const start = Math.max(0, startSeconds);
      const end = endSeconds > start ? endSeconds : start + 2;
      this.cues.splice(insertAt, 0, {
        index: insertAt + 1,
        startSeconds: start,
        endSeconds: end,
        text: '',
      });
      this.reindexCues();
      this.markDirty();
      this.$nextTick(() => {
        const list = this.$refs.cueList as HTMLElement | undefined;
        const el = list?.querySelector(`[data-cue-index="${insertAt}"]`);
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    },
    addCueAfter(idx: number) {
      const prev = this.cues[idx];
      if (!prev) return;
      const next = this.cues[idx + 1];
      let start = prev.endSeconds;
      let end = next ? next.startSeconds : start + 2;
      if (end - start < 0.1) {
        end = start + 2;
      }
      this.insertCueAt(idx + 1, start, end);
    },
    removeCue(idx: number) {
      if (idx < 0 || idx >= this.cues.length) return;
      if (this.editingTime?.idx === idx) {
        this.editingTime = null;
      } else if (this.editingTime && this.editingTime.idx > idx) {
        this.editingTime = { ...this.editingTime, idx: this.editingTime.idx - 1 };
      }
      this.cues.splice(idx, 1);
      this.reindexCues();
      this.markDirty();
    },
    markDirty() {
      this.dirty = true;
      this.saveMessage = '';
      this.persistState();
    },
    async saveTranscript() {
      if (this.cues.length === 0) return;
      const path = this.transcriptPath || (this.transcriptFile ? getFilePath(this.transcriptFile) : '');
      if (!path) {
        this.saveMessage = 'Cannot save: transcript file path unknown.';
        this.saveError = true;
        return;
      }
      this.saving = true;
      this.saveMessage = '';
      this.saveError = false;
      try {
        const out = serializeSubtitle(this.cues, this.transcriptName || this.transcriptFile?.name || path);
        this.fs.writeFileSync(path, out, 'utf-8');
        this.saveMessage = 'Saved.';
        this.saveError = false;
        this.dirty = false;
        this.persistState();
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
