<template>
  <div class="flex flex-col flex-1 min-h-0 overflow-hidden">
    <mc-file-upload 
      v-if="showFileUpload" 
      action="convert" 
      @files-uploaded="handleFilesUploaded" 
      @bad-extension="handleBadExtension"
    />
    <template v-else>
      <div class="flex flex-col flex-1 min-h-0 overflow-hidden">
        <mc-binary-modal :show-modal="showBinaryModal" @response="handleOverwriteResponse" />
        <div class="flex-1 min-h-0 grid grid-cols-4 gap-2 overflow-hidden">
          <mc-file-grid 
            class="col-span-3 h-full" 
            :files="files" 
            :processing="converting"
            @file-selected="handleFileSelected" 
            @files-loaded="handleFilesLoaded"
          >
            <template v-slot:spacing>
              <div class="h-full"></div>
            </template>
          </mc-file-grid>
          <mc-meta-data-column class="col-span-1 gap-2 bg-base-200 rounded-xl min-h-0" :files-loading="filesLoading" :selected-file="selectedFile" />
        </div>
        <mc-data-intake class="shrink-0">
    <template v-slot:data-intake>
      <div v-if="!converting" class="flex justify-between items-center gap-10">
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="w-24 shrink-0 text-right text-sm">Format:</span>
            <div class="dropdown dropdown-top shrink-0">
              <div tabindex="0" role="button" class="btn btn-sm bg-base-100 w-28" style="text-transform: none;">{{ outputFileExtension }}</div>
              <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52 mb-2">
                <li @click="handleFormatSelect('.mp4')"><a>.mp4</a></li>
                <li @click="handleFormatSelect('.mov')"><a>.mov</a></li>
                <li @click="handleFormatSelect('.m4v')"><a>.m4v</a></li>
              </ul>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-24 shrink-0 text-right text-sm">Video bitrate:</span>
            <div class="dropdown dropdown-top shrink-0">
              <div tabindex="0" role="button" class="btn btn-sm bg-base-100 w-28" style="text-transform: none;">{{ effectiveVideoBitrateLabel }}</div>
              <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52 mb-2 max-h-60 overflow-y-auto">
                <li v-for="opt in videoBitrateOptions" :key="opt.value" @click="handleVideoBitrateSelect(opt.value)">
                  <a>{{ opt.label }}</a>
                </li>
                <li @click="handleVideoBitrateSelect('custom')"><a>Custom...</a></li>
              </ul>
            </div>
            <input
              v-if="videoBitrateIsCustom"
              type="text"
              v-model="bitrate"
              class="input input-sm w-20 text-center shrink-0"
              placeholder="—"
            />
            <span class="w-12 shrink-0 text-sm">kbit/s</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-24 shrink-0 text-right text-sm">Audio bitrate:</span>
            <div class="dropdown dropdown-top shrink-0">
              <div tabindex="0" role="button" class="btn btn-sm bg-base-100 w-28" style="text-transform: none;">{{ audioBitrate }}</div>
              <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52 mb-2">
                <li v-for="opt in audioBitrateOptions" :key="opt" @click="handleAudioBitrateSelect(opt)">
                  <a>{{ opt }}</a>
                </li>
              </ul>
            </div>
            <span class="w-12 shrink-0 text-sm">kbit/s</span>
          </div>

        </div>
        <div class="space-y-2 flex-grow max-w-md">
          <div class="flex items-center space-x-2">
            <span class="w-20 text-left shrink-0">Resolution:</span>
            <input
              type="number"
              v-model.number="outputWidth"
              min="0"
              step="2"
              class="resolution-input input input-sm focus:outline-none w-24 text-center"
              @input="onWidthInput"
            />
            <span>×</span>
            <input
              type="number"
              v-model.number="outputHeight"
              min="0"
              step="2"
              class="resolution-input input input-sm focus:outline-none w-24 text-center"
              @input="onHeightInput"
            />
            <span>px</span>
          </div>
          <div class="flex items-start gap-2">
            <span class="w-20 shrink-0 text-left pt-1.5">Output:</span>
            <div class="flex-1 min-w-0 space-y-1">
              <div class="flex items-center gap-2">
                <input type="text" readonly placeholder="None" v-model="outputFilePath" class="input input-sm w-full border focus:outline-none" />
                <label class="btn btn-sm btn-ghost border border-base-content shrink-0" @click="setOutputPath">browse</label>
              </div>
              <div v-if="estimatedBitrateKbps !== null" class="text-xs text-base-content/70 space-y-0.5">
                <p>Estimated bitrate: <strong>{{ estimatedBitrateKbps }} kbit/s</strong></p>
                <p v-if="estimatedFileSizeMB !== null">Estimated file size: <strong>{{ estimatedFileSizeMB }} MB</strong></p>
              </div>
            </div>
          </div>
        </div>
        <label class="btn btn-primary" @click="handleGenerate()">
          generate
        </label>
      </div>
      <div class="py-3" v-else>
        <div class="mb-2 text-base font-medium flex justify-between">
          <span>Converting...</span>
          <span>{{ Math.floor(progressForDisplay) }}%</span>
        </div>
        <div class="w-full bg-base-100 rounded-full h-2.5">
          <div class="bg-primary h-2.5 rounded-full" :style="'width: ' + progressForDisplay + '%; transition: width 0.3s ease-in-out;'"></div>
        </div>
      </div>
    </template>
        </mc-data-intake>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useAppStore } from '../stores/appStore';
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


export default defineComponent({
  name: 'VideoConverter',
  components: { McBinaryModal, McDataIntake, McFileUpload, McFileGrid, McMetaDataColumn, McTimeInput },
  emits: ['toggle-toast'],
  setup() {
    const appRootDir = require('app-root-dir').get();
    const appStore = useAppStore();
    const os = require('os');
    const ffmpeg = require('ffmpeg-static');
    const ffprobe = require('@ffprobe-installer/ffprobe');
    const spawn = require('child_process').spawn;
    const ipcRenderer = require('electron').ipcRenderer;
    const dialog = require('electron').dialog;
    const path = require('path');
    const fs = require('fs');
    return { appRootDir, appStore, dialog, fs, ipcRenderer, os, path, ffmpeg, ffprobe, spawn }
  },
  data(){
    return {
      audioBitrate: '128' as string,
      audioBitrateOptions: ['64', '96', '128', '160', '192', '256', '320'] as string[],
      binaryModalResolver: null as (() => void) | null,
      bitrate: '3000' as string,
      errorMessage: '' as string,
      videoBitrateIsCustom: false as boolean,
      videoBitrateOptions: [
        { value: '1000', label: '1000' },
        { value: '1500', label: '1500' },
        { value: '2500', label: '2500' },
        { value: '3000', label: '3000' },
        { value: '5000', label: '5000' },
        { value: '8000', label: '8000' },
        { value: '10000', label: '10000' },
        { value: '15000', label: '15000' },
        { value: '20000', label: '20000' },
      ] as { value: string; label: string }[],
      files: ref<File[]>([]),
      fileObjects: [] as FileData[],
      filesLoading: true as boolean,
      formatDropdownOpen: false as boolean,
      converting: false as boolean,
      outputFilePath: 'None' as string,
      outputFileExtension: '.mp4' as string,
      overwriteResponse: null as null | boolean,
      progress: 0 as number,
      /** Display-only progress: never decreases during a run, prevents bar from bouncing to 0. */
      progressDisplay: 0 as number,
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
      tempDir: '' as string,
      toast: {} as Toast,
      toastMessage: '' as string,
      successToastMessage: '' as string,
      conversionReport: '' as string,
      outputWidth: 0 as number,
      outputHeight: 0 as number,
    }
  },
  watch: {
    selectedFile: {
      handler(newVal: FileData) {
        if (newVal && newVal.width > 0 && newVal.height > 0) {
          this.outputWidth = newVal.width;
          this.outputHeight = newVal.height;
        }
      },
      deep: true,
    },
  },
  mounted() {
    this.setOutputPathFromStorage();
  },
  computed: {
    /** Progress value for the bar and label; never decreases during a run. */
    progressForDisplay(): number {
      return this.progressDisplay;
    },
    /** Label for the video bitrate dropdown button (value only; unit is shown outside). */
    effectiveVideoBitrateLabel(): string {
      if (this.videoBitrateIsCustom) {
        return this.bitrate || 'Custom';
      }
      return this.bitrate;
    },
    /** Estimated overall bitrate (video + audio + ~1.5% overhead). */
    estimatedBitrateKbps(): number | null {
      const v = parseInt(this.bitrate, 10);
      const a = parseInt(this.audioBitrate, 10);
      if (Number.isNaN(v) || Number.isNaN(a) || v < 0 || a < 0) return null;
      const overhead = 1.015;
      return Math.round((v + a) * overhead);
    },
    /** Estimated file size in MB using selected file duration and estimated overall bitrate. */
    estimatedFileSizeMB(): number | null {
      if (this.estimatedBitrateKbps === null || !this.selectedFile?.duration) return null;
      const sec = this.getSeconds(this.selectedFile.duration);
      if (sec <= 0) return null;
      const bits = this.estimatedBitrateKbps * 1000 * sec;
      const bytes = bits / 8;
      return Math.round((bytes / (1024 * 1024)) * 10) / 10;
    },
  },
  methods: {
    setOutputPathFromStorage() {
      if (this.appStore.conOutputPath) {
        this.outputFilePath = this.appStore.conOutputPath;
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
      console.log(this.$refs);
      process.nextTick(() => {
        this.files.push(...uploadedFiles);
        this.showFileUpload = false;
        this.selectedFile.file = this.files[0];
      });
      
    },

    handleFileSelected(file: any) {
      this.selectedFile = file;
      if (file && file.width > 0 && file.height > 0) {
        this.outputWidth = file.width;
        this.outputHeight = file.height;
      }
    },
    ensureEven(n: number): number {
      const v = Math.max(0, Math.floor(n));
      return v % 2 === 0 ? v : v - 1;
    },
    onWidthInput() {
      const w = Number(this.outputWidth) || 0;
      if (w >= 0 && this.selectedFile.width > 0 && this.selectedFile.height > 0) {
        const h = Math.round((w * this.selectedFile.height) / this.selectedFile.width);
        this.outputHeight = this.ensureEven(h);
      }
    },
    onHeightInput() {
      const h = Number(this.outputHeight) || 0;
      if (h >= 0 && this.selectedFile.width > 0 && this.selectedFile.height > 0) {
        const w = Math.round((h * this.selectedFile.width) / this.selectedFile.height);
        this.outputWidth = this.ensureEven(w);
      }
    },
    handleFormatSelect(format: string) {
      this.outputFileExtension = format;
      this.formatDropdownOpen = false;
    },
    handleVideoBitrateSelect(value: string) {
      if (value === 'custom') {
        this.videoBitrateIsCustom = true;
      } else {
        this.videoBitrateIsCustom = false;
        this.bitrate = value;
      }
    },
    handleAudioBitrateSelect(value: string) {
      this.audioBitrate = value;
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
        this.successToastMessage = numFiles + ' File Converted Successfully  🎉'
      } 
      else {
        this.successToastMessage = numFiles + ' Files Converted Successfully  🎉'
      }
    },

    handleFilesLoaded(fileObjects: FileData[]) {
      if (fileObjects) {
        this.filesLoading = false
        this.fileObjects = fileObjects;
        this.setSuccessToastMsg(fileObjects.length)
      }
    },

    async setOutputPath() {
      await this.ipcRenderer.invoke('dialog').then((result: string) => {
        this.outputFilePath = result;
        this.appStore.setConOutputPath(result);
      })
    },

    errorsFlagged(): boolean {
      if (this.videoBitrateIsCustom && !(/^\d+$/.test(this.bitrate))) {
        this.toastMessage = 'Please enter a valid video bitrate';
        return true;
      } else if (this.outputFilePath === 'None' || this.outputFilePath === null || !this.outputFilePath) {
        this.toastMessage = 'Please enter a valid output path';
        return true;
      } else {
        return false;
      }
    },

    fileAlreadyExists,

    getSeconds,

    parseFfmpegConvertProgress,

    parseFFmpegProgress,
    
    removeExtension,

    getShortestVideoDuration,

    async handleGenerate() {
      if (!this.errorsFlagged()) {
        await this.convertVideos();
      } else {
        this.toast = {
          message: this.toastMessage,
          kind: 'alert-error',
          timeout: 3000
        }
        this.$emit('toggle-toast', this.toast)
      }
    },

    handleConversionComplete() {
      this.converting = false;
      this.progress = 0;
      this.progressDisplay = 0;

      const aborted = this.overwriteResponse === false;
      if (aborted) {
        this.toastMessage = 'Conversion aborted.';
      } else {
        this.toastMessage = this.conversionReport ? `${this.successToastMessage} ${this.conversionReport}` : this.successToastMessage;
      }

      const body = aborted ? this.toastMessage : (this.conversionReport || this.successToastMessage);
      this.toast = {
        message: this.toastMessage,
        kind: 'alert-success',
        timeout: 5000,
      };
      this.$emit('toggle-toast', this.toast);
      new window.Notification(aborted ? 'Conversion aborted' : 'Conversion complete', { body });
      this.conversionReport = '';
    },

    anyVideosExists(): boolean {
      for (const file of this.files) {
        const newFile = removeExtension(file.name) + this.outputFileExtension;
        const newFilePath = this.path.join(this.outputFilePath, newFile);
        if (fileAlreadyExists(newFilePath)) {
          return true;
        }
      }
      return false;
    },

    /** Overall container bitrate (format) — matches File Properties / overall bitrate display. */
    getFormatBitrateKbps(filePath: string): Promise<number | null> {
      return new Promise((resolve) => {
        const ffprobePath = (this.ffprobe as { path: string }).path.replace('app.asar', 'app.asar.unpacked');
        const child = this.spawn(ffprobePath, [
          '-v', 'error',
          '-show_entries', 'format=bit_rate,duration',
          '-of', 'default=noprint_wrappers=1:nokey=1',
          '-i', filePath,
        ], { stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '';
        child.stdout?.on('data', (d: Buffer) => { out += d.toString(); });
        child.stderr?.on('data', (d: Buffer) => { out += d.toString(); });
        child.on('close', (code: number) => {
          if (code !== 0) { resolve(null); return; }
          const firstLine = out.trim().split(/\r?\n/)[0] ?? '';
          const bps = parseInt(firstLine, 10);
          resolve(Number.isNaN(bps) ? null : Math.round(bps / 1000));
        });
        child.on('error', () => resolve(null));
      });
    },

    runFfmpeg(args: string[], fileObj: FileData, progressStart: number, progressEnd: number): Promise<void> {
      return new Promise((resolve, reject) => {
        const ffmpegPath = this.ffmpeg.replace('app.asar', 'app.asar.unpacked');
        const childProcess = this.spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
        if (!childProcess || !childProcess.stderr) {
          reject(new Error('Failed to spawn FFmpeg process.'));
          return;
        }
        const pattern = /time=(\d+:\d+:\d+\.\d+)/;
        childProcess.stderr.on('data', (data: Buffer | string) => {
          const pct = this.parseFFmpegProgress(data.toString(), '00:00:00', fileObj.duration, pattern);
          const raw = progressStart + (pct / 100) * (progressEnd - progressStart);
          const value = Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : this.progress;
          this.progress = value;
          if (value > this.progressDisplay) {
            this.progressDisplay = value;
          }
        });
        childProcess.on('close', (code: number | null, signal: string | null) => {
          if (code === 0) resolve();
          else if (code != null) reject(new Error(`FFmpeg exited with code ${code}`));
          else reject(new Error(`FFmpeg ended unexpectedly${signal ? ` (${signal})` : ''}`));
        });
        childProcess.on('error', reject);
      });
    },

    async convertVideos() {
      const didShowOverwriteModal = this.anyVideosExists();
      if (didShowOverwriteModal) {
        this.showBinaryModal = true;
        await new Promise<void>((resolve) => {
          // @ts-ignore
          this.binaryModalResolver = resolve;
        });
      }

      // Only abort when we actually showed the modal and the user chose not to overwrite.
      // Otherwise a stale overwriteResponse from a previous run would skip conversion.
      if (didShowOverwriteModal && this.overwriteResponse !== true) {
        this.handleConversionComplete();
        return;
      }

      const totalFiles = this.fileObjects.length;
      if (totalFiles === 0) {
        this.toast = { message: 'No files to convert.', kind: 'alert-error', timeout: 4000 };
        this.$emit('toggle-toast', this.toast);
        return;
      }

      const targetKbps = parseInt(this.bitrate, 10);
      const bitrateK = this.bitrate + 'k';
      const audioBitrateK = this.audioBitrate + 'k';
      const overwriteFlag = this.overwriteResponse === true ? ['-y'] : [];
      this.converting = true;
      this.progress = 0;
      this.progressDisplay = 0;
      this.conversionReport = '';

      // Two-pass for accuracy. Constrain with maxrate 1.5× target and bufsize 2× target.
      const maxrateK = (Math.round(targetKbps * 1.5)) + 'k';
      const bufsizeK = (targetKbps * 2) + 'k';

      const outputPaths: string[] = [];
      const evenW = this.outputWidth > 0 && this.outputHeight > 0 ? this.ensureEven(this.outputWidth) : 0;
      const evenH = this.outputWidth > 0 && this.outputHeight > 0 ? this.ensureEven(this.outputHeight) : 0;
      const scaleFilter =
        evenW > 0 && evenH > 0
          ? `scale=${evenW}:${evenH}:force_original_aspect_ratio=decrease,pad=${evenW}:${evenH}:(ow-iw)/2:(oh-ih)/2`
          : null;

      try {
        for (let i = 0; i < totalFiles; i++) {
          const fileObj = this.fileObjects[i] as FileData;
          const outputPath = this.path.join(
            this.outputFilePath,
            this.removeExtension(fileObj.file.name) + this.outputFileExtension
          );
          outputPaths.push(outputPath);

          const baseName = this.path.basename(fileObj.file.name, this.path.extname(fileObj.file.name));
          const safeBase = baseName.replace(/\W/g, '_').slice(0, 50);
          const passlogPrefix = this.path.join(this.os.tmpdir(), `mcswiss-2pass-${safeBase}-${i}`);
          const pass1OutPath = this.path.join(this.os.tmpdir(), `mcswiss-pass1-${safeBase}-${i}.mkv`);

          const progressFileStart = (i / totalFiles) * 100;
          const progressFileEnd = ((i + 1) / totalFiles) * 100;
          const progressMid = progressFileStart + (progressFileEnd - progressFileStart) * 0.5;

          const pass1Base = [
            '-y',
            '-i', fileObj.file.path,
            '-c:v', 'libx264',
            '-pass', '1',
            '-b:v', bitrateK,
            '-passlogfile', passlogPrefix,
            '-maxrate', maxrateK,
            '-bufsize', bufsizeK,
            '-preset', 'medium',
            '-an',
            '-f', 'matroska',
            pass1OutPath,
          ];
          const pass1Args = scaleFilter ? [...pass1Base.slice(0, 3), '-vf', scaleFilter, ...pass1Base.slice(3)] : pass1Base;
          await this.runFfmpeg(pass1Args, fileObj, progressFileStart, progressMid);

          const pass2Base = [
            ...overwriteFlag,
            '-i', fileObj.file.path,
            '-c:v', 'libx264',
            '-pass', '2',
            '-b:v', bitrateK,
            '-passlogfile', passlogPrefix,
            '-maxrate', maxrateK,
            '-bufsize', bufsizeK,
            '-preset', 'medium',
            '-c:a', 'aac',
            '-strict', 'experimental',
            '-b:a', audioBitrateK,
            outputPath,
          ];
          const pass2Insert = overwriteFlag.length + 2;
          const pass2Args = scaleFilter ? [...pass2Base.slice(0, pass2Insert), '-vf', scaleFilter, ...pass2Base.slice(pass2Insert)] : pass2Base;
          await this.runFfmpeg(pass2Args, fileObj, progressMid, progressFileEnd);

          for (const p of [
            passlogPrefix + '-0.log',
            passlogPrefix + '-0.log.mbtree',
            pass1OutPath,
          ]) {
            try { this.fs.unlinkSync(p); } catch (_) {}
          }
        }

        const overallKbpsList: (number | null)[] = [];
        for (const p of outputPaths) {
          const kbps = await this.getFormatBitrateKbps(p);
          overallKbpsList.push(kbps);
        }
        const withKbps = overallKbpsList.filter((k): k is number => k != null);
        const overallStr = withKbps.length === 0 ? '—' : withKbps.length === 1 ? `${withKbps[0]} kbit/s` : withKbps.map((k) => `${k} kbit/s`).join(', ');
        const parts = [
          `Video: ${targetKbps} kbit/s target.`,
          `Overall: ${overallStr}.`,
        ];
        this.conversionReport = parts.join(' ');
      } catch (err) {
        console.error('Conversion error:', err);
        this.converting = false;
        this.progress = 0;
        this.progressDisplay = 0;
        this.toast = { message: 'Conversion failed.', kind: 'alert-error', timeout: 5000 };
        this.$emit('toggle-toast', this.toast);
        return;
      }

      this.handleConversionComplete();
    },
  }
});
</script>
<style scoped>
.resolution-input::-webkit-inner-spin-button,
.resolution-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.resolution-input {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>