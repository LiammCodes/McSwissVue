<template>
  <div class="flex flex-col flex-1 min-h-0 overflow-hidden">
    <mc-binary-modal :show-modal="showBinaryModal" @response="handleOverwriteResponse" />
    <div class="flex-1 min-h-0 grid grid-cols-4 gap-2 overflow-hidden">
      <mc-file-upload
        v-if="showFileUpload"
        class="col-span-3 h-full"
        action="create thumbnails for"
        hint="Video: .mp4, .mov, .m4v"
        embedded
        @files-uploaded="handleFilesUploaded"
        @bad-extension="handleBadExtension"
      />
      <div
        v-else
        class="col-span-3 h-full min-h-0 flex flex-col gap-2 overflow-hidden"
        :class="{ 'min-h-0': !hyperMode }"
      >
        <div
          v-if="!hyperMode"
          class="flex-1 min-h-0 bg-base-200 rounded-xl overflow-hidden flex flex-col shrink"
        >
          <div v-if="filesLoading" class="flex-1 flex items-center justify-center">
            <span class="loading loading-spinner text-primary loading-lg"></span>
          </div>
          <div
            v-else-if="scrubPreviewPanelVisible"
            class="flex min-h-0 flex-1 flex-col bg-black"
          >
            <div class="relative min-h-0 flex-1 flex flex-col overflow-hidden">
              <div
                v-if="previewTranscoding"
                class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/75 text-sm text-base-content px-4 text-center"
              >
                <span class="loading loading-spinner text-primary loading-lg"></span>
                <span>Encoding preview (H.264, max 1280px wide — faster than full-res)…</span>
                <span v-if="previewTranscodeProgress > 0" class="tabular-nums text-xs text-base-content/70">
                  {{ Math.min(100, Math.round(previewTranscodeProgress)) }}%
                </span>
              </div>
              <p
                v-if="previewTranscodeError"
                class="absolute inset-x-0 top-2 z-10 mx-auto max-w-md px-3 text-center text-xs text-error"
              >
                {{ previewTranscodeError }}
              </p>
              <div
                v-if="previewVideoSrc"
                ref="previewVideoHost"
                class="relative min-h-0 w-full flex-1 overflow-hidden"
              >
                <video
                  :key="previewVideoSrc"
                  ref="previewVideo"
                  :src="previewVideoSrc"
                  class="absolute inset-0 h-full w-full object-contain bg-black [pointer-events:auto]"
                  playsinline
                  tabindex="-1"
                  @click.prevent.stop
                  @dblclick.prevent.stop
                  @timeupdate="onPreviewTimeUpdate"
                  @loadedmetadata="onPreviewLoadedMetadata"
                  @play="previewUiPlaying = true"
                  @pause="previewUiPlaying = false"
                  @error="onPreviewVideoError"
                  @loadeddata="onPreviewVideoLoadedData"
                />
                <div
                  v-if="showVerticalCropOverlay"
                  class="pointer-events-none absolute inset-0 z-20"
                >
                  <div
                    class="pointer-events-auto absolute touch-none rounded-sm border-2 border-primary ring-1 ring-base-100/80"
                    :class="verticalCropDrag?.kind === 'move' ? 'cursor-grabbing' : 'cursor-move'"
                    :style="cropOverlayStyle"
                    @pointerdown="onVerticalCropMovePointerDown"
                  >
                    <div
                      class="crop-handle pointer-events-auto absolute -left-1.5 -top-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-sm border-2 border-primary bg-base-100 shadow"
                      title="Resize"
                      @pointerdown.stop="onVerticalCropResizeCornerDown($event, 'nw')"
                    />
                    <div
                      class="crop-handle pointer-events-auto absolute -right-1.5 -top-1.5 h-3.5 w-3.5 cursor-nesw-resize rounded-sm border-2 border-primary bg-base-100 shadow"
                      title="Resize"
                      @pointerdown.stop="onVerticalCropResizeCornerDown($event, 'ne')"
                    />
                    <div
                      class="crop-handle pointer-events-auto absolute -bottom-1.5 -left-1.5 h-3.5 w-3.5 cursor-nesw-resize rounded-sm border-2 border-primary bg-base-100 shadow"
                      title="Resize"
                      @pointerdown.stop="onVerticalCropResizeCornerDown($event, 'sw')"
                    />
                    <div
                      class="crop-handle pointer-events-auto absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-sm border-2 border-primary bg-base-100 shadow"
                      title="Resize"
                      @pointerdown.stop="onVerticalCropResizeCornerDown($event, 'se')"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div
              v-if="previewVideoSrc"
              class="flex shrink-0 items-center gap-2 border-t border-base-content/20 bg-base-300 px-2 py-1.5"
            >
              <button
                type="button"
                class="btn btn-ghost btn-sm btn-square shrink-0"
                :title="previewUiPlaying ? 'Pause' : 'Play'"
                :aria-label="previewUiPlaying ? 'Pause preview' : 'Play preview'"
                @click="togglePreviewPlayback"
              >
                <pause-icon v-if="previewUiPlaying" class="h-5 w-5" />
                <play-icon v-else class="h-5 w-5" />
              </button>
              <input
                type="range"
                class="range range-primary range-xs min-h-0 min-w-0 flex-1"
                :min="0"
                :max="Math.max(previewDurationSec, 0.001)"
                :step="0.01"
                :value="previewPlayheadSeconds"
                :disabled="!previewDurationSec"
                aria-label="Seek preview"
                @input="onPreviewSeekInput"
              />
              <span class="shrink-0 tabular-nums text-xs text-base-content/90">
                {{ formattedPlayhead }} / {{ formattedPreviewDuration }}
              </span>
            </div>
          </div>
          <div v-else class="flex-1 flex items-center justify-center text-base-content/50 text-sm px-4 text-center">
            Select a video in the list to preview it
          </div>
        </div>
        <mc-file-grid
          :class="hyperMode ? 'flex-1 min-h-0 h-full' : 'min-h-[9rem] max-h-[42%] shrink-0 overflow-hidden flex flex-col'"
          :files="files"
          :processing="generating"
          @file-selected="handleFileSelected"
          @files-loaded="handleFilesLoaded"
          @bad-extension="handleBadExtension"
        >
          <template v-slot:spacing>
            <div class="h-full"></div>
          </template>
        </mc-file-grid>
      </div>
      <mc-meta-data-column class="col-span-1 gap-2 bg-base-200 rounded-xl min-h-0" :files-loading="filesLoading" :selected-file="selectedFile" />
    </div>
    <mc-data-intake class="shrink-0">
      <template v-slot:data-intake>
      <div
        v-if="!generating"
        class="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between lg:gap-x-8 lg:gap-y-3"
      >
        <template v-if="hyperMode">
          <div class="flex justify-end items-center lg:justify-start">
            <mc-time-input
              v-model="time"
              label="Start timestamp"
            />
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-2 lg:max-w-md">
            <div class="flex flex-wrap items-center justify-end gap-2">
              <span class="shrink-0">Output:</span>
              <input
                type="text"
                readonly
                placeholder="None"
                v-model="outputFilePath"
                class="input input-sm min-w-0 flex-1 border focus:outline-none"
              />
              <label class="btn btn-sm btn-ghost shrink-0 border border-base-content" @click="setOutputPath">browse</label>
            </div>
          </div>
          <label class="btn btn-primary shrink-0" @click="handleGenerate()">
            generate
          </label>
        </template>
        <template v-else>
          <div class="flex w-full flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
            <div class="flex items-center gap-1.5 shrink-0">
              <p class="text-sm tabular-nums text-base-content/90">
                Playhead: <span class="font-medium text-base-content">{{ formattedPlayhead }}</span>
              </p>
              <div class="tooltip tooltip-top" :data-tip="scrubThumbnailHelpTip">
                <button
                  type="button"
                  class="btn btn-ghost btn-sm btn-circle min-h-8 min-w-8 text-base-content/60 hover:text-base-content"
                  aria-label="How grabbing thumbnails at the playhead works"
                >
                  <information-circle-icon class="h-5 w-5" />
                </button>
              </div>
            </div>
            <div class="flex min-w-0 flex-1 flex-wrap items-end justify-end gap-3">
              <div class="flex min-w-0 flex-1 flex-col gap-2 sm:min-w-[16rem] lg:max-w-xl">
                <div class="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end">
                  <span class="shrink-0 text-sm">Output:</span>
                  <input
                    type="text"
                    readonly
                    placeholder="None"
                    v-model="outputFilePath"
                    class="input input-sm min-w-0 flex-1 border focus:outline-none"
                  />
                  <label class="btn btn-sm btn-ghost shrink-0 border border-base-content" @click="setOutputPath">browse</label>
                </div>
              </div>
              <div class="flex w-full shrink-0 flex-col items-stretch gap-2 sm:w-auto sm:min-w-[12rem]">
                <label
                  class="flex cursor-pointer items-center gap-2 rounded-lg border border-base-300 bg-base-100 px-2 py-1.5 text-sm"
                  title="9:16 crop on the preview; output is scaled to 1080×1920. Drag to move, corner to resize."
                >
                  <input v-model="verticalThumb9x16" type="checkbox" class="checkbox checkbox-sm checkbox-primary" />
                  <span>Vertical 9:16</span>
                </label>
                <button type="button" class="btn btn-primary btn-sm w-full shrink-0" @click="handleGenerate">
                  Grab thumbnails at playhead
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
      <div class="py-3" v-else>
        <div class="mb-2 text-base font-medium flex justify-between">
          <span>Generating Thumbnails...</span>
          <span>{{ Math.floor(progress) }}%</span>
        </div>
        <div class="w-full bg-base-100 rounded-full h-2.5">
          <div class="bg-primary h-2.5 rounded-full" :style="'width: ' + progress + '%; transition: width 0.3s ease-in-out;'"></div>
        </div>
      </div>
      </template>
    </mc-data-intake>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useAppStore } from '../stores/appStore';
import { useTabsStore } from '../stores/tabsStore';
import { FileData, Toast } from '../types/Types';
import { 
  fileAlreadyExists,
  getSeconds,
  getShortestVideoDuration,
  parseFfmpegConvertProgress,
  parseFFmpegProgress,
  removeExtension
} from '../utils/HelperFunctions';
import McFileUpload from '../components/McFileUpload.vue';
import McFileGrid from '../components/McFileGrid.vue';
import McDataIntake from '../components/McDataIntake.vue';
import McBinaryModal from '../components/modals/McBinaryModal.vue';
import McTimeInput from '../components/McTimeInput.vue';
import McMetaDataColumn from '../components/McMetaDataColumn.vue';
import { InformationCircleIcon } from '@heroicons/vue/24/outline';
import { PlayIcon, PauseIcon } from '@heroicons/vue/24/solid';
import { getFilePath } from '../utils/electronFilePath';

/** Codecs / pixel formats Chromium often cannot paint; never feed the original file to the video element (avoids decoder spam). */
function chromiumDecoderLikelyUnsupported(codec?: string, pixFmt?: string): boolean {
  const c = (codec || '').toLowerCase();
  const p = (pixFmt || '').toLowerCase();
  if (['hevc', 'h265', 'prores', 'vp9', 'av1', 'mpeg2video', 'vc1', 'mjpeg'].includes(c)) return true;
  if (p && (p.includes('p10') || p.includes('10le') || p.includes('12le') || p.includes('14le'))) return true;
  return false;
}

export default defineComponent({
  name: 'HyperThumbnailGen',
  components: {
    McBinaryModal,
    McDataIntake,
    McFileUpload,
    McFileGrid,
    McMetaDataColumn,
    McTimeInput,
    InformationCircleIcon,
    PlayIcon,
    PauseIcon,
  },
  emits: ['toggle-toast'],
  props: {
    tabId: { type: String, default: null },
    /** When true (Hyper Thumbnail Generator tab), use timestamp input. When false (Thumbnail Generator), use preview scrubber + playhead capture. */
    hyperMode: { type: Boolean, default: true },
  },
  setup() {
    const appRootDir = require('app-root-dir').get();
    const appStore = useAppStore();
    const tabsStore = useTabsStore();
    const ffmpeg = require('ffmpeg-static');
    const spawn = require('child_process').spawn;
    const ipcRenderer = require('electron').ipcRenderer;
    const dialog = require('electron').dialog;
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const { pathToFileURL } = require('url');
    return { appRootDir, appStore, tabsStore, dialog, fs, ipcRenderer, os, path, pathToFileURL, ffmpeg, spawn }
  },
  watch: {
    generating(newVal: boolean) {
      if (this.tabId)
        this.tabsStore.setTabProgress(this.tabId, newVal ? this.progress : null);
    },
    progress(newVal: number) {
      if (this.tabId && this.generating)
        this.tabsStore.setTabProgress(this.tabId, newVal);
    },
    hyperMode() {
      if (this.hyperMode) {
        this.endVerticalCropDrag();
        this.killScrubPreviewPipeline();
        this.scrubProxyPlaybackUrl = '';
        this.previewTranscoding = false;
        this.previewTranscodeError = '';
        this.previewTranscodeProgress = 0;
        this.verticalCrop = null;
        this.verticalCropRefVw = 0;
        this.verticalCropRefVh = 0;
      } else {
        this.$nextTick(() => this.updateScrubPreviewAfterSelectionChange());
      }
    },
    selectedFile: {
      handler() {
        this.previewPlayheadSeconds = 0;
        this.updateScrubPreviewAfterSelectionChange();
      },
      deep: true,
    },
    verticalThumb9x16(enabled: boolean) {
      if (this.hyperMode) return;
      if (!enabled) {
        this.endVerticalCropDrag();
        this.verticalCrop = null;
        this.verticalCropRefVw = 0;
        this.verticalCropRefVh = 0;
        return;
      }
      this.$nextTick(() => {
        this.bumpPreviewLayout();
        this.tryInitVerticalCropFromPreviewVideo();
      });
    },
    'selectedFile.width'() {
      if (this.hyperMode || !this.verticalThumb9x16) return;
      const w = this.selectedFile?.width ?? 0;
      const h = this.selectedFile?.height ?? 0;
      if (w > 0 && h > 0) {
        this.$nextTick(() => {
          this.tryInitVerticalCropFromPreviewVideo();
          this.bumpPreviewLayout();
        });
      }
    },
  },
  data(){
    return {
      binaryModalResolver: null as (() => void) | null,
      errorMessage: '' as string,
      files: ref<File[]>([]),
      filesLoading: true as boolean,
      fileObjects: [] as FileData[],
      generating: false as boolean,
      outputFilePath: 'None' as string,
      outputFileExtension: '.png' as string,
      overwriteResponse: null as null | boolean,
      progress: 0 as number,
      selectedFile: {
        bitrate: '' as string,
        duration: '' as string,
        file: null as null | File,
        thumbnailPath: '' as string,
        width: 0 as number,
        height: 0 as number,
      } as FileData,
      shortestDuration: null as null | number,
      showBinaryModal: false as boolean,
      showFileUpload: true as boolean,
      showToast: false,
      time: '00:00:00' as string,
      tempDir: '' as string,
      toast: {} as Toast,
      toastMessage: '' as string,
      successToastMessage: '' as string,
      previewPlayheadSeconds: 0 as number,
      scrubThumbnailHelpTip:
        'Scrub the preview, then capture at the playhead. The same time offset is used for every file in the batch.',
      scrubProxyPlaybackUrl: '' as string,
      previewTranscoding: false as boolean,
      previewTranscodeError: '' as string,
      previewTranscodeProgress: 0 as number,
      previewGenerationId: 0 as number,
      previewDimensionProbeTimer: null as ReturnType<typeof setTimeout> | null,
      previewFfmpegChild: null as any,
      scrubPreviewTempDir: '' as string,
      lastScrubProxyFile: '' as string,
      previewTranscodeStderrBuf: '' as string,
      /** Thumbnail Generator only: export a center-cropped 9:16 frame (1080×1920). */
      verticalThumb9x16: false as boolean,
      /** Preview-space crop in pixels (reference = preview video intrinsic size). w:h = 9:16. */
      verticalCrop: null as { x: number; y: number; w: number; h: number } | null,
      verticalCropRefVw: 0 as number,
      verticalCropRefVh: 0 as number,
      previewLayoutVersion: 0 as number,
      previewVideoResizeObserver: null as ResizeObserver | null,
      verticalCropDrag: null as null | {
        kind: 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se';
        pointerId: number;
        grabOx: number;
        grabOy: number;
        cropX: number;
        cropY: number;
        anchorX?: number;
        anchorY?: number;
      },
      /** Preview timeline (seconds); from video metadata. */
      previewDurationSec: 0 as number,
      previewUiPlaying: false as boolean,
    }
  },
  async mounted() {
    this.setOutputPathFromStorage();
    let base = '';
    try {
      base = await this.ipcRenderer.invoke('get-app-path');
    } catch (_) {}
    const dir = base
      ? this.path.join(base, 'mcswiss-scrub-preview')
      : this.path.join(this.os.tmpdir(), 'mcswiss-scrub-preview');
    try {
      this.fs.mkdirSync(dir, { recursive: true });
    } catch (_) {}
    this.scrubPreviewTempDir = dir;
    this.$nextTick(() => this.attachPreviewVideoResizeObserver());
  },
  beforeUnmount() {
    this.detachPreviewVideoResizeObserver();
    this.endVerticalCropDrag();
    this.killScrubPreviewPipeline();
    if (this.lastScrubProxyFile) {
      try {
        this.fs.unlinkSync(this.lastScrubProxyFile);
      } catch (_) {}
    }
  },
  computed: {
    scrubPreviewPanelVisible(): boolean {
      if (this.hyperMode) return false;
      return !!getFilePath(this.selectedFile?.file ?? null);
    },
    /** Proxy URL if ready; else direct file URL only when not encoding (avoids mounting bad codecs on the video element). */
    previewVideoSrc(): string {
      if (this.hyperMode) return '';
      if (this.scrubProxyPlaybackUrl) return this.scrubProxyPlaybackUrl;
      if (this.previewTranscoding) return '';
      const p = getFilePath(this.selectedFile?.file ?? null);
      return p ? this.pathToFileURL(p).toString() : '';
    },
    formattedPlayhead(): string {
      return this.formatSecondsAsTimecode(this.previewPlayheadSeconds);
    },
    formattedPreviewDuration(): string {
      return this.formatSecondsAsTimecode(this.previewDurationSec);
    },
    showVerticalCropOverlay(): boolean {
      return (
        !this.hyperMode &&
        this.verticalThumb9x16 &&
        !!this.previewVideoSrc &&
        !this.previewTranscoding &&
        !!this.verticalCrop &&
        this.verticalCropRefVw > 0
      );
    },
    cropOverlayStyle(): Record<string, string> {
      void this.previewLayoutVersion;
      if (!this.verticalCrop) return { display: 'none' };
      const video = this.getPreviewVideoEl();
      if (!video) return { display: 'none' };
      const cr = this.getVideoContentRect(video);
      if (!cr) return { display: 'none' };
      const sw = this.verticalCropRefVw;
      const sh = this.verticalCropRefVh;
      if (!sw || !sh) return { display: 'none' };
      const { x, y, w, h } = this.verticalCrop;
      const left = cr.offX + (x / sw) * cr.dispW;
      const top = cr.offY + (y / sh) * cr.dispH;
      const width = (w / sw) * cr.dispW;
      const height = (h / sh) * cr.dispH;
      return {
        left: `${left}px`,
        top: `${top}px`,
        width: `${Math.max(8, width)}px`,
        height: `${Math.max(8, height)}px`,
        boxShadow: '0 0 0 100vmax rgba(0,0,0,0.45)',
      };
    },
  },
  methods: {
    killScrubPreviewPipeline() {
      if (this.previewDimensionProbeTimer != null) {
        clearTimeout(this.previewDimensionProbeTimer);
        this.previewDimensionProbeTimer = null;
      }
      if (this.previewFfmpegChild) {
        try {
          this.previewFfmpegChild.kill('SIGKILL');
        } catch (_) {}
        this.previewFfmpegChild = null;
      }
    },

    updateScrubPreviewAfterSelectionChange() {
      this.endVerticalCropDrag();
      this.verticalCrop = null;
      this.verticalCropRefVw = 0;
      this.verticalCropRefVh = 0;
      this.detachPreviewVideoResizeObserver();
      this.killScrubPreviewPipeline();
      this.previewGenerationId += 1;
      const gen = this.previewGenerationId;
      this.scrubProxyPlaybackUrl = '';
      this.previewTranscodeError = '';
      this.previewTranscodeProgress = 0;
      this.previewTranscodeStderrBuf = '';
      this.previewDurationSec = 0;
      this.previewUiPlaying = false;

      if (this.hyperMode) {
        this.previewTranscoding = false;
        return;
      }

      const p = getFilePath(this.selectedFile?.file ?? null);
      if (!p) {
        this.previewTranscoding = false;
        return;
      }

      if (
        chromiumDecoderLikelyUnsupported(
          this.selectedFile.videoCodec,
          this.selectedFile.videoPixFmt,
        )
      ) {
        this.previewTranscoding = true;
        this.runFastScrubProxyTranscode(p, gen);
        return;
      }

      this.previewTranscoding = false;
      this.previewDimensionProbeTimer = setTimeout(() => {
        this.checkScrubPreviewStillBlackThenTranscode(p, gen);
      }, 1500);
    },

    checkScrubPreviewStillBlackThenTranscode(sourcePath: string, gen: number) {
      this.previewDimensionProbeTimer = null;
      if (gen !== this.previewGenerationId || this.hyperMode) return;
      if (this.scrubProxyPlaybackUrl) return;
      const el = this.$refs.previewVideo as HTMLVideoElement | HTMLVideoElement[] | undefined;
      const video = Array.isArray(el) ? el[0] : el;
      if (video && video.videoWidth > 0 && video.videoHeight > 0) return;
      if (this.previewTranscoding) return;
      this.previewTranscoding = true;
      this.runFastScrubProxyTranscode(sourcePath, gen);
    },

    runFastScrubProxyTranscode(sourcePath: string, gen: number) {
      if (!this.scrubPreviewTempDir) {
        this.scrubPreviewTempDir = this.path.join(this.os.tmpdir(), 'mcswiss-scrub-preview');
        try {
          this.fs.mkdirSync(this.scrubPreviewTempDir, { recursive: true });
        } catch (_) {}
      }
      if (this.previewFfmpegChild) {
        try {
          this.previewFfmpegChild.kill('SIGKILL');
        } catch (_) {}
        this.previewFfmpegChild = null;
      }

      const outPath = this.path.join(
        this.scrubPreviewTempDir,
        `scrub-preview-${gen}-${Date.now()}.mp4`,
      );
      if (this.lastScrubProxyFile && this.lastScrubProxyFile !== outPath) {
        try {
          this.fs.unlinkSync(this.lastScrubProxyFile);
        } catch (_) {}
      }
      this.lastScrubProxyFile = outPath;

      const durationLabel = this.selectedFile?.duration || '00:00:01';
      const ffmpegPath = this.ffmpeg.replace('app.asar', 'app.asar.unpacked');
      const args = [
        '-hide_banner',
        '-loglevel',
        'error',
        '-stats',
        '-y',
        '-i',
        sourcePath,
        '-map',
        '0:v:0',
        '-an',
        '-sn',
        '-vf',
        "scale='min(1280,iw)':-2,format=yuv420p",
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-crf',
        '30',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        outPath,
      ];
      const child = this.spawn(ffmpegPath, args);
      this.previewFfmpegChild = child;

      child.stderr?.on('data', (chunk: Buffer) => {
        if (gen !== this.previewGenerationId) return;
        this.previewTranscodeStderrBuf += chunk.toString();
        if (this.previewTranscodeStderrBuf.length > 8000) {
          this.previewTranscodeStderrBuf = this.previewTranscodeStderrBuf.slice(-4000);
        }
        const pct = parseFfmpegConvertProgress(this.previewTranscodeStderrBuf, durationLabel);
        if (pct > this.previewTranscodeProgress) {
          this.previewTranscodeProgress = Math.min(99, pct);
        }
      });

      child.on('close', (code: number) => {
        this.previewFfmpegChild = null;
        if (gen !== this.previewGenerationId) {
          try {
            this.fs.unlinkSync(outPath);
          } catch (_) {}
          return;
        }
        this.previewTranscoding = false;
        this.previewTranscodeProgress = 0;
        if (code === 0) {
          this.previewTranscodeError = '';
          this.scrubProxyPlaybackUrl = this.pathToFileURL(outPath).href;
          this.$nextTick(() => {
            this.attachPreviewVideoResizeObserver();
            this.bumpPreviewLayout();
            this.tryInitVerticalCropFromPreviewVideo();
          });
        } else {
          this.previewTranscodeError =
            'Could not build preview video. You can still use Hyper Thumbnail Generator with a timecode.';
        }
      });
      child.on('error', (err: Error) => {
        this.previewFfmpegChild = null;
        if (gen !== this.previewGenerationId) return;
        this.previewTranscoding = false;
        this.previewTranscodeProgress = 0;
        this.previewTranscodeError = err?.message || 'Preview FFmpeg failed to start.';
      });
    },

    onPreviewVideoError() {
      if (this.hyperMode) return;
      const p = getFilePath(this.selectedFile?.file ?? null);
      if (!p) return;
      if (this.scrubProxyPlaybackUrl) return;
      if (this.previewTranscoding) return;
      if (this.previewDimensionProbeTimer != null) {
        clearTimeout(this.previewDimensionProbeTimer);
        this.previewDimensionProbeTimer = null;
      }
      this.previewTranscoding = true;
      const gen = this.previewGenerationId;
      this.runFastScrubProxyTranscode(p, gen);
    },

    onPreviewVideoLoadedData() {
      if (this.hyperMode) return;
      const el = this.$refs.previewVideo as HTMLVideoElement | HTMLVideoElement[] | undefined;
      const video = Array.isArray(el) ? el[0] : el;
      if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) return;

      if (!this.scrubProxyPlaybackUrl && !this.previewTranscoding) {
        if (this.previewDimensionProbeTimer != null) {
          clearTimeout(this.previewDimensionProbeTimer);
          this.previewDimensionProbeTimer = null;
        }
      }

      this.$nextTick(() => {
        this.attachPreviewVideoResizeObserver();
        this.bumpPreviewLayout();
        this.tryInitVerticalCropFromPreviewVideo();
      });
    },

    formatSecondsAsTimecode(totalSeconds: number): string {
      const s = Math.max(0, totalSeconds);
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const secWhole = Math.floor(s % 60);
      const sub = s % 1;
      const pad = (n: number) => String(n).padStart(2, '0');
      const fracPart = sub >= 0.005 ? sub.toFixed(2).substring(1) : '';
      return `${pad(h)}:${pad(m)}:${pad(secWhole)}${fracPart}`;
    },
    onPreviewTimeUpdate(ev: Event) {
      const el = ev.target as HTMLVideoElement;
      this.previewPlayheadSeconds = el.currentTime;
    },
    onPreviewLoadedMetadata() {
      if (this.hyperMode) return;
      const v = this.getPreviewVideoEl();
      if (v && Number.isFinite(v.duration) && v.duration > 0) {
        this.previewDurationSec = v.duration;
      }
    },
    togglePreviewPlayback() {
      if (this.hyperMode) return;
      const v = this.getPreviewVideoEl();
      if (!v) return;
      if (v.paused) {
        void v.play();
      } else {
        v.pause();
      }
    },
    onPreviewSeekInput(e: Event) {
      if (this.hyperMode) return;
      const v = this.getPreviewVideoEl();
      if (!v) return;
      const t = parseFloat((e.target as HTMLInputElement).value);
      if (!Number.isFinite(t)) return;
      v.currentTime = Math.max(0, Math.min(t, v.duration || t));
      this.previewPlayheadSeconds = v.currentTime;
    },
    seekArgForFfmpeg(): string {
      if (this.hyperMode) return this.time;
      const el = this.$refs.previewVideo as HTMLVideoElement | HTMLVideoElement[] | undefined;
      const video = Array.isArray(el) ? el[0] : el;
      const t = video ? video.currentTime : 0;
      return String(Math.max(0, t));
    },
    playheadSecondsForValidation(): number {
      if (this.hyperMode) return this.getSeconds(this.time);
      const el = this.$refs.previewVideo as HTMLVideoElement | HTMLVideoElement[] | undefined;
      const video = Array.isArray(el) ? el[0] : el;
      return video ? Math.max(0, video.currentTime) : 0;
    },
    bumpPreviewLayout() {
      this.previewLayoutVersion++;
    },
    attachPreviewVideoResizeObserver() {
      this.detachPreviewVideoResizeObserver();
      const host = this.$refs.previewVideoHost as HTMLElement | HTMLElement[] | undefined;
      const el = Array.isArray(host) ? host[0] : host;
      if (!el || typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(() => this.bumpPreviewLayout());
      ro.observe(el);
      this.previewVideoResizeObserver = ro;
    },
    detachPreviewVideoResizeObserver() {
      if (this.previewVideoResizeObserver) {
        this.previewVideoResizeObserver.disconnect();
        this.previewVideoResizeObserver = null;
      }
    },
    getPreviewVideoEl(): HTMLVideoElement | null {
      const el = this.$refs.previewVideo as HTMLVideoElement | HTMLVideoElement[] | undefined;
      const v = Array.isArray(el) ? el[0] : el;
      return v ?? null;
    },
    getVideoContentRect(video: HTMLVideoElement): {
      vw: number;
      vh: number;
      dispW: number;
      dispH: number;
      offX: number;
      offY: number;
    } | null {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return null;
      const cw = video.clientWidth;
      const ch = video.clientHeight;
      if (!cw || !ch) return null;
      const scale = Math.min(cw / vw, ch / vh);
      const dispW = vw * scale;
      const dispH = vh * scale;
      const offX = (cw - dispW) / 2;
      const offY = (ch - dispH) / 2;
      return { vw, vh, dispW, dispH, offX, offY };
    },
    /**
     * Map pointer to coordinates in the **source** frame (full video resolution),
     * using selected-file metadata so proxy previews (scaled transcode) still match exports.
     */
    clientToSourcePx(clientX: number, clientY: number, video: HTMLVideoElement): { vx: number; vy: number } | null {
      const r = video.getBoundingClientRect();
      const cr = this.getVideoContentRect(video);
      if (!cr) return null;
      const sw = this.verticalCropRefVw;
      const sh = this.verticalCropRefVh;
      if (!sw || !sh) return null;
      const lx = clientX - r.left - cr.offX;
      const ly = clientY - r.top - cr.offY;
      if (lx < 0 || ly < 0 || lx > cr.dispW || ly > cr.dispH) return null;
      return {
        vx: (lx / cr.dispW) * sw,
        vy: (ly / cr.dispH) * sh,
      };
    },
    defaultVerticalCropForVideo(vw: number, vh: number): { x: number; y: number; w: number; h: number } {
      const k = Math.max(1, Math.min(Math.floor(vw / 9), Math.floor(vh / 16)));
      const w = 9 * k;
      const h = 16 * k;
      const x = Math.floor((vw - w) / 2);
      const y = Math.floor((vh - h) / 2);
      return { x, y, w, h };
    },
    tryInitVerticalCropFromPreviewVideo() {
      if (this.hyperMode || !this.verticalThumb9x16) return;
      const metaW = this.selectedFile?.width ?? 0;
      const metaH = this.selectedFile?.height ?? 0;
      if (metaW <= 0 || metaH <= 0) return;
      const video = this.getPreviewVideoEl();
      if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) return;
      const vw = metaW;
      const vh = metaH;
      const needsNew =
        !this.verticalCrop ||
        this.verticalCropRefVw !== vw ||
        this.verticalCropRefVh !== vh;
      if (needsNew) {
        this.verticalCrop = this.defaultVerticalCropForVideo(vw, vh);
        this.verticalCropRefVw = vw;
        this.verticalCropRefVh = vh;
      }
    },
    endVerticalCropDrag() {
      if (!this.verticalCropDrag) return;
      window.removeEventListener('pointermove', this.onVerticalCropWindowPointerMove);
      window.removeEventListener('pointerup', this.onVerticalCropWindowPointerUp);
      window.removeEventListener('pointercancel', this.onVerticalCropWindowPointerUp);
      this.verticalCropDrag = null;
    },
    onVerticalCropMovePointerDown(e: PointerEvent) {
      if (!this.verticalCrop || this.hyperMode || !this.verticalThumb9x16) return;
      e.preventDefault();
      const video = this.getPreviewVideoEl();
      if (!video) return;
      const pt = this.clientToSourcePx(e.clientX, e.clientY, video);
      if (!pt) return;
      this.endVerticalCropDrag();
      this.verticalCropDrag = {
        kind: 'move',
        pointerId: e.pointerId,
        grabOx: pt.vx - this.verticalCrop.x,
        grabOy: pt.vy - this.verticalCrop.y,
        cropX: this.verticalCrop.x,
        cropY: this.verticalCrop.y,
      };
      window.addEventListener('pointermove', this.onVerticalCropWindowPointerMove);
      window.addEventListener('pointerup', this.onVerticalCropWindowPointerUp);
      window.addEventListener('pointercancel', this.onVerticalCropWindowPointerUp);
    },
    onVerticalCropResizeCornerDown(e: PointerEvent, corner: 'nw' | 'ne' | 'sw' | 'se') {
      if (!this.verticalCrop || this.hyperMode || !this.verticalThumb9x16) return;
      e.preventDefault();
      e.stopPropagation();
      const video = this.getPreviewVideoEl();
      if (!video) return;
      const c = this.verticalCrop;
      let ax: number;
      let ay: number;
      switch (corner) {
        case 'se':
          ax = c.x;
          ay = c.y;
          break;
        case 'nw':
          ax = c.x + c.w;
          ay = c.y + c.h;
          break;
        case 'ne':
          ax = c.x;
          ay = c.y + c.h;
          break;
        case 'sw':
          ax = c.x + c.w;
          ay = c.y;
          break;
      }
      this.endVerticalCropDrag();
      this.verticalCropDrag = {
        kind: `resize-${corner}` as 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se',
        pointerId: e.pointerId,
        grabOx: 0,
        grabOy: 0,
        cropX: 0,
        cropY: 0,
        anchorX: ax,
        anchorY: ay,
      };
      window.addEventListener('pointermove', this.onVerticalCropWindowPointerMove);
      window.addEventListener('pointerup', this.onVerticalCropWindowPointerUp);
      window.addEventListener('pointercancel', this.onVerticalCropWindowPointerUp);
    },
    onVerticalCropWindowPointerMove(e: PointerEvent) {
      if (!this.verticalCropDrag || !this.verticalCrop) return;
      if (e.pointerId !== this.verticalCropDrag.pointerId) return;
      const video = this.getPreviewVideoEl();
      if (!video) return;
      const vw = this.verticalCropRefVw;
      const vh = this.verticalCropRefVh;
      const drag = this.verticalCropDrag;

      if (drag.kind === 'move') {
        const pt = this.clientToSourcePx(e.clientX, e.clientY, video);
        if (!pt) return;
        let nx = pt.vx - drag.grabOx;
        let ny = pt.vy - drag.grabOy;
        const { w, h } = this.verticalCrop;
        nx = Math.max(0, Math.min(nx, vw - w));
        ny = Math.max(0, Math.min(ny, vh - h));
        this.verticalCrop = { ...this.verticalCrop, x: Math.round(nx), y: Math.round(ny) };
      } else if (drag.kind.startsWith('resize-')) {
        const pt = this.clientToSourcePx(e.clientX, e.clientY, video);
        if (!pt) return;
        const corner = drag.kind.slice('resize-'.length) as 'nw' | 'ne' | 'sw' | 'se';
        const ax = drag.anchorX!;
        const ay = drag.anchorY!;
        let k: number;
        let kMax: number;
        let nc: { x: number; y: number; w: number; h: number };
        switch (corner) {
          case 'se':
            k = Math.min(Math.floor((pt.vx - ax) / 9), Math.floor((pt.vy - ay) / 16));
            kMax = Math.min(Math.floor((vw - ax) / 9), Math.floor((vh - ay) / 16));
            k = Math.max(1, Math.min(k, kMax));
            nc = { x: ax, y: ay, w: 9 * k, h: 16 * k };
            break;
          case 'nw':
            k = Math.min(Math.floor((ax - pt.vx) / 9), Math.floor((ay - pt.vy) / 16));
            kMax = Math.min(Math.floor(ax / 9), Math.floor(ay / 16));
            k = Math.max(1, Math.min(k, kMax));
            nc = { x: ax - 9 * k, y: ay - 16 * k, w: 9 * k, h: 16 * k };
            break;
          case 'ne':
            k = Math.min(Math.floor((pt.vx - ax) / 9), Math.floor((ay - pt.vy) / 16));
            kMax = Math.min(Math.floor((vw - ax) / 9), Math.floor(ay / 16));
            k = Math.max(1, Math.min(k, kMax));
            nc = { x: ax, y: ay - 16 * k, w: 9 * k, h: 16 * k };
            break;
          case 'sw':
            k = Math.min(Math.floor((ax - pt.vx) / 9), Math.floor((pt.vy - ay) / 16));
            kMax = Math.min(Math.floor(ax / 9), Math.floor((vh - ay) / 16));
            k = Math.max(1, Math.min(k, kMax));
            nc = { x: ax - 9 * k, y: ay, w: 9 * k, h: 16 * k };
            break;
          default:
            return;
        }
        this.verticalCrop = nc;
      }
    },
    onVerticalCropWindowPointerUp(e: PointerEvent) {
      if (!this.verticalCropDrag || e.pointerId !== this.verticalCropDrag.pointerId) return;
      this.endVerticalCropDrag();
    },
    getVideoDimsForFile(file: File): { w: number; h: number } {
      const path = getFilePath(file);
      const fo = this.fileObjects.find((f) => f.file && getFilePath(f.file) === path);
      if (fo && fo.width > 0 && fo.height > 0) return { w: fo.width, h: fo.height };
      return { w: this.verticalCropRefVw, h: this.verticalCropRefVh };
    },
    verticalThumbnailFilterForFile(file: File): string | null {
      if (!this.verticalCrop || this.verticalCropRefVw <= 0 || this.verticalCropRefVh <= 0) return null;
      const { w: tw, h: th } = this.getVideoDimsForFile(file);
      if (tw <= 0 || th <= 0) return null;
      const rx = this.verticalCrop.x / this.verticalCropRefVw;
      const ry = this.verticalCrop.y / this.verticalCropRefVh;
      const rw = this.verticalCrop.w / this.verticalCropRefVw;
      const rh = this.verticalCrop.h / this.verticalCropRefVh;
      let x = Math.round(rx * tw);
      let y = Math.round(ry * th);
      let w = Math.round(rw * tw);
      let h = Math.round(rh * th);
      x = Math.max(0, Math.min(x, tw - 1));
      y = Math.max(0, Math.min(y, th - 1));
      w = Math.max(9, Math.min(w, tw - x));
      h = Math.max(16, Math.min(h, th - y));
      let k = Math.min(Math.floor(w / 9), Math.floor(h / 16));
      k = Math.max(1, k);
      w = 9 * k;
      h = 16 * k;
      if (x + w > tw) x = Math.max(0, tw - w);
      if (y + h > th) y = Math.max(0, th - h);
      w -= w % 2;
      h -= h % 2;
      x -= x % 2;
      y -= y % 2;
      return `crop=${w}:${h}:${x}:${y},scale=1080:1920`;
    },
    setOutputPathFromStorage() {
      if (this.appStore.hypThumbOutputPath) {
        this.outputFilePath = this.appStore.hypThumbOutputPath;
      }
    },
    handleBadExtension() {
      this.$emit('toggle-toast', {
        message: 'Only .mp4, .mov, and .m4v files are allowed',
        kind: 'alert-error',
        timeout: 3000
      })
    },
    handleFilesUploaded(uploadedFiles: File[]) {
      process.nextTick(() => {
        this.files.push(...uploadedFiles);
        this.showFileUpload = false;
      });
    },

    handleFileSelected(file: any) {
      this.selectedFile = file;
    },

    handleOverwriteResponse(response: string): void {
      this.showBinaryModal = false;
      this.overwriteResponse = response === 'yes';
      
      // Resolve the promise to signal that the modal is closed
      if (this.binaryModalResolver) {
        this.binaryModalResolver();
      }
    },

    setSuccessToastMsg(numFiles: number) {
      if (numFiles === 1) {
        this.successToastMessage = numFiles + ' Thumbnail Generated Successfully  🎉'
      } 
      else {
        this.successToastMessage = numFiles + ' Thumbnails Generated Successfully  🎉'
      }
    },

    handleFilesLoaded(fileObjects: FileData[]) {
      this.filesLoading = false;
      this.fileObjects = fileObjects;
      this.files = fileObjects.map((fo) => fo.file);
      if (fileObjects.length === 0) {
        this.showFileUpload = true;
      } else {
        this.setSuccessToastMsg(fileObjects.length);
        this.shortestDuration = getShortestVideoDuration(fileObjects);
      }
    },

    async setOutputPath() {
      const result = await this.ipcRenderer.invoke('dialog');
      if (result != null) {
        this.outputFilePath = result;
        this.appStore.setHypThumbOutputPath(result);
      }
    },

    errorsFlagged(): boolean {
      if (this.outputFilePath === 'None' || this.outputFilePath === null || !this.outputFilePath) {
        this.toastMessage = 'Please enter a valid output path';
        return true;
      }
      if (this.shortestDuration == null || this.files.length === 0) {
        this.toastMessage = 'Add at least one video';
        return true;
      }
      if (!this.hyperMode) {
        if (!this.selectedFile?.file || !getFilePath(this.selectedFile.file)) {
          this.toastMessage = 'Select a video in the list to choose a frame';
          return true;
        }
        if (this.previewTranscoding) {
          this.toastMessage = 'Still preparing preview…';
          return true;
        }
        if (!this.previewVideoSrc) {
          this.toastMessage = this.previewTranscodeError
            ? 'Preview failed for this file. Try Hyper Thumbnail Generator or another export.'
            : 'Select a video in the list to choose a frame';
          return true;
        }
        const at = this.playheadSecondsForValidation();
        if (at > this.shortestDuration + 0.05) {
          this.toastMessage = 'Playhead is past the end of the shortest video in the batch';
          return true;
        }
        if (this.verticalThumb9x16) {
          if (!this.selectedFile?.width || !this.selectedFile?.height) {
            this.toastMessage = 'Still reading video size… wait a moment, then try again.';
            return true;
          }
          if (!this.verticalCrop || this.verticalCropRefVw <= 0 || this.verticalCropRefVh <= 0) {
            this.toastMessage =
              'Wait for the preview to finish loading so the vertical crop can be placed.';
            return true;
          }
        }
        return false;
      }
      const clipDuration = this.getSeconds(this.time);
      if (clipDuration > this.shortestDuration) {
        this.toastMessage = 'Please enter a valid start and end time';
        return true;
      }
      return false;
    },

    fileAlreadyExists,

    getSeconds,

    parseFFmpegProgress,
    
    removeExtension,

    getShortestVideoDuration,

    async handleGenerate() {
      if (!this.errorsFlagged()) {
        await this.generateThumbnails();
      } else {
        this.toast = {
          message: this.toastMessage,
          kind: 'alert-error',
          timeout: 3000
        }
        this.$emit('toggle-toast', this.toast)
      }
    },

    handleGenerationComplete() {
      this.generating = false;
      this.progress = 0;

      if (this.overwriteResponse || this.overwriteResponse === null) {
        this.toastMessage = this.successToastMessage;
      } else {
        this.toastMessage = 'Thumbnail generation aborted.';
      }

      this.toast = {
        message: this.overwriteResponse ? this.successToastMessage : this.toastMessage,
        kind: 'alert-success',
        timeout: 5000,
      }
      this.$emit('toggle-toast', this.toast);
      new window.Notification('Thumbnail Generation Complete', { body: this.successToastMessage });
    },

    anyThumbnailsExists(): boolean {
      for (const file of this.files) {
        const newFile = removeExtension(file.name) + this.outputFileExtension;
        const newFilePath = this.path.join(this.outputFilePath, newFile);
        if (fileAlreadyExists(newFilePath)) {
          return true;
        }
      }
      return false;
    },

    async generateThumbnails() {
      // check if any new files already exist
      if (this.anyThumbnailsExists()) {
        // Toggle the modal
        this.showBinaryModal = true;

        // Wait for the modal to close before triggering the action
        await new Promise((resolve) => {
          // @ts-ignore
          this.binaryModalResolver = resolve;
        });
      } 

      if (this.overwriteResponse || this.overwriteResponse === null) {


        const seekArg = this.seekArgForFfmpeg();
        this.files.forEach((file: any, i: number) => {
          const useVertical = !this.hyperMode && this.verticalThumb9x16;
          const vf = useVertical ? this.verticalThumbnailFilterForFile(file) : null;
          const ffmpegCommand = [
            '-ss', seekArg,
            '-i', getFilePath(file),
            ...(useVertical && vf ? ['-vf', vf] : []),
            '-vframes', '1',
            '-q:v', '2',
            this.path.join(this.outputFilePath, this.removeExtension(file.name) + ".png")
          ];
          this.generating = true;
          const childProcess = this.spawn(this.ffmpeg.replace('app.asar', 'app.asar.unpacked'), ffmpegCommand);
          
          if (childProcess) { // Check if childProcess is not null
            childProcess.stdout.on('data', (data: any) => {
              console.log(data)
              // this.progress = this.parseFFmpegProgress(data, this.startTime, this.endTime);
            });
            childProcess.stderr.on('data', async (data: any) => {
              const message = data.toString().trim();
              if (message.includes('Overwrite? [y/N]')) {
                const overwrite: string = this.overwriteResponse ? 'y' : 'n';
                childProcess.stdin.write(overwrite + '\n');
              } 
            });
            childProcess.on('close', (code: any) => this.handleGenerationComplete());
            childProcess.on('error', (err: any) => {
              this.generating = false;
              this.toast = {
                message: 'Thumbnail generation failed: ' + (err?.message || 'FFmpeg error'),
                kind: 'alert-error',
                timeout: 5000
              };
              this.$emit('toggle-toast', this.toast);
            });
          } else {
            console.error('Failed to spawn FFMpeg process.');
            this.generating = false;
            this.toast = {
              message: 'Thumbnail generation failed: could not start FFmpeg.',
              kind: 'alert-error',
              timeout: 5000
            };
            this.$emit('toggle-toast', this.toast);
          }
          this.progress = ((i+1) / this.files.length) * 100;
        });

      } else {
        this.handleGenerationComplete();
      }
     
    }
  }
});
</script>
<style>
</style>