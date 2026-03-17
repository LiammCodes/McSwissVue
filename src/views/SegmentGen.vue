<template>
  <div class="flex flex-col flex-1 min-h-0 overflow-hidden">
    <mc-binary-modal :show-modal="showBinaryModal" @response="handleOverwriteResponse" />
    <!-- Hidden grid used only to build FileData (metadata) for the single file -->
    <div v-if="!showFileUpload && files.length > 0" class="hidden w-0 h-0 overflow-hidden">
      <mc-file-grid
        :key="files[0]?.name ?? 'single'"
        ref="segmentFileGrid"
        :files="files"
        :processing="generating"
        @files-loaded="handleFilesLoaded"
        @bad-extension="handleBadExtension"
      />
    </div>
    <div class="flex-1 min-h-0 flex gap-2 overflow-hidden min-w-0">
      <!-- Left: upload zone OR player + metadata -->
      <div class="flex-1 min-w-0 flex flex-col gap-2 overflow-hidden">
        <mc-file-upload
          v-if="showFileUpload"
          class="flex-1 h-full"
          action="create segments for"
          hint="Video: .mp4, .mov, .m4v"
          :multiple-files="false"
          embedded
          @files-uploaded="handleFilesUploaded"
          @bad-extension="handleBadExtension"
        />
        <template v-else>
          <!-- Video player -->
          <div class="flex-1 min-h-0 bg-base-200 rounded-xl overflow-hidden flex flex-col">
            <div v-if="filesLoading" class="flex-1 flex items-center justify-center">
              <span class="loading loading-spinner text-primary loading-lg"></span>
            </div>
            <video
              v-else-if="videoSrc"
              :src="videoSrc"
              controls
              class="w-full h-full object-contain bg-black"
              playsinline
            />
            <div v-else class="flex-1 flex items-center justify-center text-base-content/50">
              No video
            </div>
          </div>
          <!-- Metadata below player -->
          <div class="shrink-0 bg-base-200 rounded-xl p-3">
            <div class="flex items-center justify-between gap-2 mb-2 min-w-0">
              <p class="text-base font-bold truncate min-w-0" style="word-break: break-all;">{{ segmentFileName }}</p>
              <label class="btn btn-ghost btn-sm shrink-0">browse
                <input type="file" class="hidden" accept=".mp4,.mov,.m4v" @change="handleChangeFile" />
              </label>
            </div>
            <div class="bg-base-100 rounded-md text-sm p-2 space-y-3">
              <p>Duration: <span class="float-right">{{ segmentFileDuration }}</span></p>
              <p>Size: <span class="float-right">{{ segmentFileSize }}</span></p>
              <p>Bitrate: <span class="float-right">{{ segmentFileBitrate }}</span></p>
              <p>Resolution: <span class="float-right">{{ segmentFileResolution }}</span></p>
              <p>Frame rate: <span class="float-right">{{ segmentFileFrameRate }}</span></p>
            </div>
          </div>
        </template>
      </div>
      <!-- Right: segments column (only when a file is loaded) -->
      <div v-if="files.length > 0" class="w-72 shrink-0 flex flex-col min-h-0 overflow-hidden rounded-md bg-base-200/50">
        <div class="shrink-0 p-2 border-b border-base-300">
          <button type="button" class="btn btn-ghost btn-sm w-full" @click="clearSegments">clear</button>
        </div>
        <div class="flex-1 min-h-0 overflow-y-auto space-y-2 p-2">
          <mc-segment
            v-for="segment in segments"
            :key="segment.id"
            :modelValue="segment"
            @delete-segment="deleteSegment(segment.id)"
          />
          <button class="btn btn-outline btn-primary w-full" @click="addSegment">
            <plus-circle-icon color="primary" class="h-6 w-6"/>
          </button>
        </div>
      </div>
    </div>
    <mc-data-intake class="shrink-0">
      <template v-slot:data-intake>
      <div v-if="!generating" class="flex justify-between items-center gap-10">
        <div class="space-y-2 flex-grow max-w-xl">
          <div class="flex justify-end items-center space-x-2">
            <span>Output: </span><input type="text" readonly placeholder="None" v-model="outputFilePath" class="input input-sm w-full border focus:outline-none" />
            <label class="btn btn-sm btn-ghost border border-base-content" @click="setOutputPath">browse</label>
          </div>  
        </div>
        <div class="flex items-center space-x-2">
          <div class="text-right w-16">
            <span>Method:</span>
          </div>
          <div class="dropdown dropdown-top">
            <div tabindex="0" role="button" class="btn btn-sm bg-base-100 w-64" style="text-transform: none;">{{ selectedSuffix.label }}</div>
            <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-64 mb-2">
              <li 
                v-for="(suffix, index) in suffixOptions" 
                :key="index"
                @click="handleSuffixSelect(suffix)"
              >
                <a>{{ suffix.label }}</a>  
              </li>
            </ul>
          </div>
        </div> 
        <label class="btn btn-primary" @click="handleGenerate()">
          generate
        </label>
      </div>
      <div class="py-3" v-else>
        <div class="mb-2 text-base font-medium flex justify-between">
          <span>Generating Segments...</span>
          <span>{{ Math.floor(progressStr) }}%</span>
        </div>
        <div class="w-full bg-base-100 rounded-full h-2.5">
          <div class="bg-primary h-2.5 rounded-full" :style="'width: ' + progressStr + '%; transition: width 0.3s ease-in-out;'"></div>
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
import { FileData, Segment, SelectOption, Toast } from '../types/Types';
import { PlusCircleIcon } from '@heroicons/vue/24/outline';
import { 
  fileAlreadyExists,
  getSeconds,
  getShortestVideoDuration,
  parseFFmpegProgress,
  removeExtension
} from '../utils/HelperFunctions';
import McFileUpload from '../components/McFileUpload.vue';
import McFileGrid from '../components/McFileGrid.vue';
import McDataIntake from '../components/McDataIntake.vue';
import McSegment from '../components/McSegment.vue';
import McBinaryModal from '../components/modals/McBinaryModal.vue';
import McMetaDataColumn from '../components/McMetaDataColumn.vue';
import { getFilePath } from '../utils/electronFilePath';

export default defineComponent({
  name: 'SegmentGen',
  components: { McBinaryModal, McDataIntake, McFileUpload, McFileGrid, McSegment, PlusCircleIcon },
  emits: ['toggle-toast'],
  props: {
    tabId: { type: String, default: null },
  },
  setup() {
    const appRootDir = require('app-root-dir').get();
    const appStore = useAppStore();
    const tabsStore = useTabsStore();
    const os = require('os');
    const ffmpeg = require('ffmpeg-static');
    const ffprobe = require('@ffprobe-installer/ffprobe');
    const spawn = require('child_process').spawn;
    const ipcRenderer = require('electron').ipcRenderer;
    const dialog = require('electron').dialog;
    const path = require('path');
    const fs = require('fs');
    const { pathToFileURL } = require('url');
    return { appRootDir, appStore, tabsStore, dialog, fs, ipcRenderer, os, path, pathToFileURL, ffmpeg, ffprobe, spawn };
  },
  watch: {
    generating(newVal: boolean) {
      if (this.tabId)
        this.tabsStore.setTabProgress(this.tabId, newVal ? this.progressStr : null);
    },
    progressStr(newVal: number) {
      if (this.tabId && this.generating)
        this.tabsStore.setTabProgress(this.tabId, newVal);
    },
  },
  data() {
    return {
      binaryModalResolver: null as (() => void) | null,
      defaultSegment: {
        name: 'Set it later',
        startTime: '00:00:00',
        endTime: '00:00:00'
      } as Segment,
      fileObjects: [] as FileData[],
      files: ref<File[]>([]),
      filesLoading: true as boolean,
      generating: false as boolean,
      outputFilePath: 'None' as string,
      outputFileExtension: '.mp4' as string,
      overwriteResponse: null as null | boolean,

      largestEndTime: '' as string,
      smallestStartTime: '' as string,

      largestTimeDenominator: null as null | number,
      currentProgress: 0 as number,
      totalProgress: 0 as number,
      selectedFile: {
        bitrate: '' as string,
        duration: '' as string,
        file: null as null | File,
        thumbnailPath: '' as string,
        width: 0 as number,
        height: 0 as number,
      } as FileData,
      segments: [] as Segment[],
      selectedSuffix: {
        label: "Numbers",
        value: "numbers"
      } as SelectOption,
      shortestDuration: null as null | number,
      showBinaryModal: false as boolean,
      showFileUpload: true as boolean,
      suffixOptions: [
        {
          label: "Letters",
          value: "letters"
        },
        {
          label: "Numbers",
          value: "numbers"
        }
      ] as SelectOption[],
      successToastMessage: '' as string,
      toast: {} as Toast,
      toastMessage: '' as string,
    }
  },
  mounted() {
    this.setOutputPathFromStorage();
    this.setSuffixFromStorage();
  },
  computed: {
    progressStr() {
      const count = this.segments.length;
      return count > 0 ? (this.currentProgress + this.totalProgress) / count : 0;
    },
    videoSrc(): string {
      if (!this.selectedFile?.file) return '';
      const p = getFilePath(this.selectedFile.file);
      return p ? this.pathToFileURL(p).toString() : '';
    },
    segmentFileName(): string {
      return this.selectedFile?.file?.name ?? '';
    },
    segmentFileDuration(): string {
      return this.selectedFile?.duration ?? '—';
    },
    segmentFileSize(): string {
      if (this.selectedFile?.file?.size != null) {
        return this.formattedFileSize(+this.selectedFile.file.size);
      }
      return '—';
    },
    segmentFileBitrate(): string {
      return this.selectedFile?.bitrate ?? '—';
    },
    segmentFileResolution(): string {
      if (this.selectedFile && this.selectedFile.width > 0 && this.selectedFile.height > 0) {
        return `${this.selectedFile.width} × ${this.selectedFile.height}`;
      }
      return '—';
    },
    segmentFileFrameRate(): string {
      const fps = this.selectedFile?.frameRate;
      if (fps == null || !Number.isFinite(fps) || fps <= 0) return '—';
      const s = String(fps);
      return s.includes('.') ? s.replace(/\.?0+$/, '') + ' fps' : s + ' fps';
    },
  },
  methods: {
    fileAlreadyExists,
    getSeconds,
    getShortestVideoDuration,
    parseFFmpegProgress,
    removeExtension,
    
    setOutputPathFromStorage() {
      if (this.appStore.segOutputPath) {
        this.outputFilePath = this.appStore.segOutputPath;
      }
    },
    setSuffixFromStorage() {
      if (this.appStore.segSuffix) {
        if (this.appStore.segSuffix === "letters") {
          this.selectedSuffix = this.suffixOptions[0];
        } else {
          this.selectedSuffix = this.suffixOptions[1];
        }
      }
    },

    handleOverwriteResponse(response: string): void {
      this.showBinaryModal = false;
      this.overwriteResponse = response === 'yes';
      
      // Resolve the promise to signal that the modal is closed
      if (this.binaryModalResolver) {
        this.binaryModalResolver();
      }
    },

    handleBadExtension() {
      this.$emit('toggle-toast', {
        message: 'Only .mp4, .mov, and .m4v files are allowed',
        kind: 'alert-error',
        timeout: 3000
      })
    },

    handleSuffixSelect(suffix: SelectOption) {
      this.selectedSuffix = suffix;
      this.appStore.setSegSuffix(suffix.value);
      if (!this.files.length || !this.files[0]) return;
      this.segments.forEach((segment: Segment) => {
        segment.name = this.buildSegmentOutputFilename(segment);
      });
    },

    handleFilesUploaded(uploadedFiles: File[]) {
      process.nextTick(() => {
        this.files.push(...uploadedFiles);
        this.showFileUpload = false;
        this.filesLoading = true;
        this.addSegment();
      });
    },

    handleFilesLoaded(fileObjects: object[]) {
      this.filesLoading = false;
      const list = fileObjects as FileData[];
      this.fileObjects = list;
      this.files = list.map((fo) => fo.file);
      if (list.length === 0) {
        this.showFileUpload = true;
        this.selectedFile = {} as FileData;
      } else {
        this.selectedFile = list[0];
        this.shortestDuration = getShortestVideoDuration(fileObjects);
      }
    },

    formattedFileSize(bytes: number): string {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
      if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    },

    handleChangeFile(event: Event) {
      const input = event.target as HTMLInputElement;
      const selected = input.files;
      input.value = '';
      if (!selected?.length) return;
      const file = selected[0];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const accepted = ['.mp4', '.mov', '.m4v'];
      if (!accepted.includes(ext ? '.' + ext : '')) {
        this.$emit('toggle-toast', {
          message: 'Only .mp4, .mov, and .m4v files are allowed',
          kind: 'alert-error',
          timeout: 3000,
        });
        return;
      }
      this.files = [file];
      this.segments = [];
      this.filesLoading = true;
      this.selectedFile = {} as FileData;
    },

    clearSegments() {
      this.segments = [];
    },

    setSuccessToastMsg(numSegments: number) {
      if (numSegments === 1) {
        this.successToastMessage = numSegments + ' Segment Generated Successfully  🎉'
      } 
      else {
        this.successToastMessage = numSegments + ' Segments Generated Successfully  🎉'
      }
    },

    async setOutputPath() {
      const result = await this.ipcRenderer.invoke('dialog');
      if (result != null) {
        this.outputFilePath = result;
        this.appStore.setSegOutputPath(result);
      }
    },

    addSegment() {
      if (!this.files.length || !this.files[0]) {
        return;
      }
      const id = this.segments.length;
      const segment: Segment = {
        name: '', // set below via helper
        startTime: '00:00:00',
        endTime: '00:00:00',
        id
      };
      segment.name = this.buildSegmentOutputFilename(segment);
      this.segments.push(segment);
    },

    deleteSegment(id: number) {
      const index = this.segments.findIndex(segment => segment.id === id);
      if (index !== -1) {
        this.segments.splice(index, 1);
      }
    },

    errorsFlagged(): boolean {
      let hasError = false;
      this.segments.forEach((segment: Segment) => {
        const clipDuration = this.getSeconds(segment.endTime) - this.getSeconds(segment.startTime);
        if (segment.endTime === '00:00:00' || this.getSeconds(segment.startTime) > this.getSeconds(segment.endTime) 
            || clipDuration > this.shortestDuration!) {
        
          this.toastMessage = 'Please enter a valid start and end time';
          hasError = true
          return;

        } else if (this.outputFilePath === 'None' || this.outputFilePath === null || !this.outputFilePath) {

          this.toastMessage = 'Please enter a valid output path';
          hasError = true;
          return;
        } 
      });
      return hasError;
    },

    anySegmentExists(): boolean {
      if (!this.files.length || !this.files[0]) {
        return false;
      }
      for (const segment of this.segments) {
        const newFilePath = this.buildSegmentOutputPath(segment);
        if (fileAlreadyExists(newFilePath)) {
          return true;
        }
      }
      return false;
    },

    buildSegmentOutputFilename(segment: Segment): string {
      const baseName = this.removeExtension(this.files[0].name);
      const suffix = this.selectedSuffix.value === "letters"
        ? String.fromCharCode(segment.id + 97)
        : segment.id + 1;
      return `${baseName}_${suffix}${this.outputFileExtension}`;
    },

    buildSegmentOutputPath(segment: Segment): string {
      return this.path.join(this.outputFilePath, this.buildSegmentOutputFilename(segment));
    },

    async generateSegments() {
      // check if any new files already exist
      if (this.anySegmentExists()) {
        // Toggle the modal
        this.showBinaryModal = true;

        // Wait for the modal to close before triggering the action
        await new Promise((resolve) => {
          // @ts-ignore
          this.binaryModalResolver = resolve;
        });
      } 

      if (this.overwriteResponse || this.overwriteResponse === null) {
        // Variable to keep track of the current segment index
        let currentSegmentIndex = 0;

        // Function to process the next segment recursively
        const processNextSegment = async () => {
          if (currentSegmentIndex < this.segments.length) {
            this.currentProgress = 0;
            const segment = this.segments[currentSegmentIndex];
            const ffmpegCommand = [
              // @ts-ignore
              '-i', getFilePath(this.files[0]),
              '-ss', segment.startTime,
              '-to', segment.endTime,
              '-b:v', '3000k',
              '-progress', 'pipe:1',
              this.buildSegmentOutputPath(segment)
            ];

            this.generating = true;
            const childProcess = this.spawn(this.ffmpeg.replace('app.asar', 'app.asar.unpacked'), ffmpegCommand);
            
            if (childProcess) { // Check if childProcess is not null
              childProcess.stdout.on('data', (data: any) => {
                const pattern = /out_time=(\d+:\d+:\d+\.\d+)/;
                this.currentProgress = this.parseFFmpegProgress(data, segment.startTime, segment.endTime, pattern);                
              });
              childProcess.stderr.on('data', async (data: any) => {
                const message = data.toString().trim();
                if (message.includes('Overwrite? [y/N]')) {
                  const overwrite: string = this.overwriteResponse ? 'y' : 'n';
                  childProcess.stdin.write(overwrite + '\n');
                } 
              });
              childProcess.on('close', (code: any) => {
                this.totalProgress += 100;
                currentSegmentIndex++;
                processNextSegment(); // Process the next segment recursively
              });
              childProcess.on('error', (err: any) => {
                this.totalProgress += 100;
                currentSegmentIndex++;
                this.toast = {
                  message: 'Segment generation failed: ' + (err?.message || 'FFmpeg error'),
                  kind: 'alert-error',
                  timeout: 5000
                };
                this.$emit('toggle-toast', this.toast);
                processNextSegment(); // Process the next segment recursively
              });
            } else {
              console.error('Failed to spawn FFMpeg process.');
              currentSegmentIndex++;
              this.toast = {
                message: 'Segment generation failed: could not start FFmpeg.',
                kind: 'alert-error',
                timeout: 5000
              };
              this.$emit('toggle-toast', this.toast);
              processNextSegment(); // Process the next segment recursively
            }
          } else {
            this.handleGenerationComplete(); // All segments processed, handle generation completion
          }
        };

        // Start processing the first segment
        await processNextSegment();
      } else {
        this.handleGenerationComplete();
      }
    },

    handleGenerationComplete() {
      this.setSuccessToastMsg(this.segments.length)
      this.generating = false;
      this.totalProgress = 0;
      this.currentProgress = 0;

      if (this.overwriteResponse || this.overwriteResponse === null) {
        this.toastMessage = this.successToastMessage;
      } else {
        this.toastMessage = 'Segment generation aborted.';
      }

      this.toast = {
        message: this.overwriteResponse ? this.successToastMessage : this.toastMessage,
        kind: 'alert-success',
        timeout: 5000,
      }
      this.$emit('toggle-toast', this.toast);
      new window.Notification('Segment Generation Complete', { body: this.successToastMessage });
    },
    
    async handleGenerate() {
      if (!this.errorsFlagged()) {
        await this.generateSegments();
      } else {
        this.toast = {
          message: this.toastMessage,
          kind: 'alert-error',
          timeout: 3000
        }
        this.$emit('toggle-toast', this.toast)
      }
    }

  }
});
</script>