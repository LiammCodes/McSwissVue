<template>
  <div 
    class="bg-base-200 rounded-xl p-2 px-3 flex h-full" 
    style="overflow-y: auto; overflow-x: hidden;" 
    @dragover.prevent="handleDragOver"
    @drop.prevent="handleDrop"  
    @click="handleOutsideClick"
  >
    <!-- context menu -->
    <div v-if="isMenuOpen" class="menu" :style="{ top: `${menuPosition.y}px`, left: `${menuPosition.x}px` }">
      <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52 mb-2" >
        <li 
          v-for="(option, index) in menuOptions" 
          :key="index"
          @click="handleMenuOptionClick(option.value)"
        >
          <a>{{ option.label }}</a>  
        </li>
      </ul>
    </div>
    
    <input 
      type="file" 
      name="file_upload" 
      class="hidden" 
      @change="handleFileUpload" 
      accept=".mp4, .mov, .m4v"
    >
    <div v-if="filesLoading || fileObjects == null" class="flex items-center justify-center h-full w-full">
      <span class="loading loading-spinner text-primary loading-lg"></span>
    </div>
    <div v-else-if="list" class="w-full">
      <button 
        v-for="fileObj, index in fileObjects"
        :key="fileObj.file!.name"
        class="w-full p-2 my-1 rounded-md hover:bg-base-300 focus:outline-none"
        :class="selectedFile == fileObj ? 'bg-base-300': ''"
        ref="fileBtns"
        @click="handleFileSelection(fileObj)"
        @contextmenu.prevent="openMenu($event, fileObj, index)"
      >
        <div class="flex items-center justify-between space-x-3">
          <div class="flex items-center space-x-3">
            <img 
              class="rounded-md object-cover w-22 h-8" 
              :src="fileObj.thumbnailPath"
              alt="Thumbnail for selected video"
            />
            <p class="text-center break-words text-xs">{{ shortenFileName(fileObj.file!.name, 30) }}</p>
          </div>
          <div v-if="fileStatuses[index]?.value != 0" class="flex items-center space-x-4">
            <p class="text-center text-xs">{{ fileStatuses[index]?.label }}</p>
            <span v-if="fileStatuses[index]?.value < progressStatusDenominator" class="loading loading-spinner" :class="getStatusColor(index)"></span>
          </div>
        </div>
      </button>
    </div>

    <div v-else class="col-span-3 gap-2 justify-start">
      <button 
        v-for="fileObj, index in fileObjects"
        :key="fileObj.file!.name"
        :class="selectedFile == fileObj ? 'ring ring-primary': ''"
        class="w-32 items-center p-2 m-1 rounded-xl hover:bg-base-300 focus:outline-none"
        ref="fileBtns"
        @click="handleFileSelection(fileObj)"
        @contextmenu.prevent="openMenu($event, fileObj, index)"
      >
        <div class="flex flex-col items-center">
          <img 
            class="rounded-md object-cover w-22 h-16" 
            :src="fileObj.thumbnailPath"
            alt="Thumbnail for selected video"
          />
        </div>
        <p class="text-center break-words text-xs pt-2">{{ shortenFileName(fileObj.file!.name, 30) }}</p>
      </button>
    </div>
    <slot name="spacing"/>
  </div>
</template>

<script lang="ts">

import { defineComponent, PropType } from "vue";
import { FileData, SelectOption, Status } from "../types/Types";
import { getFilePath } from "../utils/electronFilePath";

const ACCEPTED_EXTENSIONS = ['.mp4', '.mov', '.m4v'];

function fileHasAcceptedExtension(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return ACCEPTED_EXTENSIONS.includes(ext ? '.' + ext : '');
}

export default defineComponent({
  emits: ['file-selected', 'files-loaded', 'bad-extension'],
  props: {
    files: {
      type: Array as PropType<File[]>,
      required: true,
    },
    list: {
      type: Boolean,
      required: false,
      default: false
    },
    processing: {
      type: Boolean,
      required: false,
      default: false
    },
    fileStatuses: {
      type: Array as PropType<Status[]>,
      required: false,
      default: [],
    },
    method: {
      type: Object as PropType<SelectOption>,
      required: false,
      default: {}
    }
  },

  setup() {
    const ipcRenderer = require('electron').ipcRenderer;
    const path = require('path');
    const ffmpeg = require('ffmpeg-static');
    const ffprobe = require('@ffprobe-installer/ffprobe').path;
    const spawn = require('child_process').spawn;
    const fs = require('fs');
    return { ffmpeg, ffprobe, fs, ipcRenderer, path, spawn, getFilePath }
  },

  data() {
    return {
      fileObjects: [] as FileData[],
      filesLoading: true as boolean,
      tempPath: '' as string,
      ffmpegPath: '' as string,
      ffprobePath: '' as string,
      fileIndexCtxClicked: null as null | number,
      isMenuOpen: false as boolean,
      multipleFiles: false as boolean,
      menuPosition: { x: 0, y: 0 } as any,
      menuOptions: [{
        label: "Remove",
        value: "remove"
      }],
      selectedFile: {} as FileData,
      showContextMenu: false as boolean
    }
  },

  async mounted() {
    await this.setTempDirectory();
    await this.buildFileObjects(this.files);
    if (this.fileObjects.length > 0) {
      this.handleFileSelection(this.fileObjects[0]);
      this.selectFirstFile();
    } else {
      this.selectedFile = {} as FileData;
      this.$emit('file-selected', this.selectedFile);
    }
    this.filesLoaded();
  },
  computed: {
    progressStatusDenominator() {
      if (this.method && this.method.value === "upload") {
        return 5;
      } else {
        return 4;
      }
    },
  },
  methods: {
    handleOutsideClick() {
      this.isMenuOpen = false;
    },

    removeFile(index: number) {
      this.fileObjects.splice(index, 1);
      if (this.fileObjects.length > 0) {
        this.handleFileSelection(this.fileObjects[0]);
      } else {
        this.selectedFile = {} as FileData;
        this.$emit('file-selected', this.selectedFile);
      }
    },
    handleMenuOptionClick(value: string) {
      if (value === 'remove') {
        if (this.fileIndexCtxClicked !== null) {
          this.removeFile(this.fileIndexCtxClicked);
          this.$emit('files-loaded', this.fileObjects);
        }
      }

      this.isMenuOpen = false;
    },
    openMenu(event: any, fileObj: FileData, fileIndex: number) {
      if (!this.processing) {
        this.isMenuOpen = true;
        this.handleFileSelection(fileObj);
        this.fileIndexCtxClicked = fileIndex;
        this.menuPosition = { x: event.pageX, y: event.pageY };
      }
    },
    closeMenu() {
      this.isMenuOpen = false;
    },

    selectFirstFile() {
      const fileButtons = this.$refs.fileBtns as HTMLElement[]; // Type assertion
      if (fileButtons && fileButtons.length > 0) {
        fileButtons[0].focus();
      }
    },

    filesLoaded() {
      this.filesLoading = false;
      this.$emit('files-loaded', this.fileObjects)
    },

    async setTempDirectory() {
      const result = await this.ipcRenderer.invoke('get-app-path');
      this.tempPath = this.path.join(result ?? '');
    },

    getStatusColor(index: number) {
      const status = this.fileStatuses[index];
      return status?.color ?? 'text-primary';
    },

    async buildFileObjects(files: File[]) {
      this.filesLoading = true;
      const filesWithPath = files.filter((file: File) => {
        const p = this.getFilePath(file);
        if (!p) console.warn('[McFileGrid] Skipping file with no path:', file.name);
        return !!p;
      });
      if (filesWithPath.length < files.length) {
        console.warn('[McFileGrid]', files.length - filesWithPath.length, 'file(s) skipped (no filesystem path)');
      }
      try {
        const fileProcessingPromises = filesWithPath.map(async (file: File) => {
          const metadata = await this.getMetaData(file);
          const thumbnailPath = await this.generateThumbnail(file, this.calculateTimeMidpoint(metadata.duration));
          const fileObj = {
            bitrate: metadata.bitrate,
            duration: metadata.duration,
            file: file,
            thumbnailPath: thumbnailPath,
            size: metadata.size,
            width: metadata.width,
            height: metadata.height,
            frameRate: metadata.frameRate,
          }
          return fileObj;
        });

        const fileObjects = await Promise.all(fileProcessingPromises)
        this.filesLoading = false;
        this.fileObjects = fileObjects;

        if (this.fileObjects.length > 0) {
          this.handleFileSelection(this.fileObjects[0]);
        } else {
          this.selectedFile = {} as FileData;
          this.$emit('file-selected', this.selectedFile);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    },

    async generateThumbnail(file: File, cutTime: string): Promise<string> {
      const filePath = this.getFilePath(file);
      if (!filePath) {
        return Promise.reject(new Error('File has no filesystem path (required for thumbnail)'));
      }
      return new Promise<string>((resolve, reject) => {
        const thumbnailFileName = this.path.basename(file.name, this.path.extname(file.name)) + ".png";
        // @ts-ignore - spawn from setup(); Node types not in Vue component type
        const childProcess = this.spawn(this.ffmpeg.replace('app.asar', 'app.asar.unpacked'), ['-y', '-ss', cutTime, '-i', filePath, '-frames:v', '1', this.path.join(this.tempPath, thumbnailFileName)]);
        
        childProcess.on('close', (code: any) => {
          // console.log("created the thumbnail: " + thumbnailFileName);
          resolve(this.path.join(this.tempPath, thumbnailFileName));
        });
        
        childProcess.stderr.on('data', (data: any) => {
          // uncomment to log ffmpeg data to console
          // console.log(`FFMpeg stderr: ${data}`);
        });
      });
    },

    async getMetaData(file: any) {
      const filePath = this.getFilePath(file);
      if (!filePath) {
        return Promise.reject(new Error('File has no filesystem path (required for ffprobe)'));
      }
      return new Promise<{ bitrate: string; duration: string; size: string; width: number; height: number; frameRate: number | null }>((resolve, reject) => {
        const result = {
          bitrate: '' as string,
          duration: '' as string,
          size: '' as string,
          width: 0 as number,
          height: 0 as number,
          frameRate: null as number | null,
        };
        const stdoutChunks: Buffer[] = [];
        // @ts-ignore - spawn/ffprobe from setup(); Node types not in Vue component type
        const childProcess = this.spawn(this.ffprobe.replace('app.asar', 'app.asar.unpacked'), [
          '-v', 'error',
          '-show_entries', 'format=bit_rate,duration,size:stream=codec_type,width,height,avg_frame_rate,r_frame_rate',
          '-of', 'json',
          '-i', filePath,
        ]);
        childProcess.stdout.on('data', (data: Buffer) => {
          stdoutChunks.push(data);
        });

        childProcess.on('close', (code: number) => {
          try {
            if (code !== 0) {
              console.warn('[getMetaData] ffprobe exited with code', code, 'for', filePath);
            }
            const raw = Buffer.concat(stdoutChunks).toString('utf8').trim();
            const json = raw ? JSON.parse(raw) : {};
            const format = json.format || {};
            const streams = json.streams || [];
            const durationSec = parseFloat(format.duration);
            if (!isNaN(durationSec) && durationSec >= 0) {
              const h = Math.floor(durationSec / 3600);
              const m = Math.floor((durationSec % 3600) / 60);
              const s = Math.floor(durationSec % 60);
              result.duration = [h, m, s].map((x) => String(x).padStart(2, '0')).join(':');
            }
            // Use format (overall) bitrate for display (matches File Properties / overall bitrate)
            const bitRateSrc = format.bit_rate;
            const bps = parseInt(bitRateSrc, 10);
            if (!isNaN(bps) && bps > 0) {
              result.bitrate = bps >= 1_000_000
                ? (bps / 1_000_000).toFixed(1) + ' Mbit/s'
                : (bps / 1000).toFixed(2).replace(/\.?0+$/, '') + ' kbit/s';
            }
            const size = format.size;
            result.size = size != null && size !== 'N/A' ? String(size) : '';
            const videoStreamForSize = streams.find((s: { codec_type?: string }) => s.codec_type === 'video');
            if (videoStreamForSize) {
              const w = parseInt(videoStreamForSize.width, 10);
              const h = parseInt(videoStreamForSize.height, 10);
              if (!isNaN(w) && !isNaN(h)) {
                result.width = w;
                result.height = h;
              }
              const frRaw = (videoStreamForSize.avg_frame_rate && videoStreamForSize.avg_frame_rate !== '0/0')
                ? videoStreamForSize.avg_frame_rate
                : videoStreamForSize.r_frame_rate;
              if (typeof frRaw === 'string' && frRaw.includes('/')) {
                const [nStr, dStr] = frRaw.split('/');
                const n = parseFloat(nStr);
                const d = parseFloat(dStr);
                if (Number.isFinite(n) && Number.isFinite(d) && d > 0) {
                  const fps = n / d;
                  // Round for display; keep enough precision for 23.976 etc.
                  result.frameRate = Math.round(fps * 1000) / 1000;
                }
              } else if (typeof frRaw === 'number' && Number.isFinite(frRaw) && frRaw > 0) {
                result.frameRate = Math.round(frRaw * 1000) / 1000;
              }
            }
          } catch (_e) {
            // Ignore parse/format errors; result keeps initial empty strings
          }
          resolve(result);
        });

        childProcess.on('error', (error: Error) => {
          reject(error);
        });
      });
    },

    shortenFileName(filename: string, maxLength: number): string {
      if (filename.length <= maxLength) {
        return filename;
      }

      // Split the filename into base name and extension
      const dotIndex = filename.lastIndexOf('.');
      const baseName = filename.slice(0, dotIndex);
      const extension = filename.slice(dotIndex);

      // Calculate the maximum length for the base name
      const maxBaseNameLength = maxLength - extension.length - 3; // 3 for the ellipsis

      // Truncate and add ellipsis if necessary
      const truncatedBaseName = baseName.slice(0, maxBaseNameLength) + '..';

      // Combine the truncated base name and extension
      const shortenedFilename = truncatedBaseName + extension;

      return shortenedFilename;
    },

    getSeconds(time: string): number {
      // Split the input string into hours, minutes, and seconds
      let [hours, minutes, seconds] = time.split(":").map(Number);
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      return totalSeconds;
    },

    secondsToString(secondsInput: number) {
      let hours = Math.floor(secondsInput / 3600);
      let minutes = Math.floor((secondsInput % 3600) / 60);
      let seconds = secondsInput % 60;

      return `${hours}:${minutes}:${seconds}`;
    },

    calculateTimeMidpoint(time: string) {
      const totalSeconds = this.getSeconds(time);
      const cutPointInSeconds = Math.floor(totalSeconds/2);

      return this.secondsToString(cutPointInSeconds);
    },

    handleFileSelection(fileObj: FileData) {
      this.selectedFile = fileObj;
      this.$emit('file-selected', fileObj);
    },

    // unused right now
    openFile(file: File) {
      this.$emit('open-file', file);
    },

    handleDragOver(event: DragEvent) {
      event.preventDefault();
    },
    handleDrop(event: DragEvent) {
      event.preventDefault();
      const files = Array.from(event.dataTransfer?.files || []);
      const bad = files.some((f) => !fileHasAcceptedExtension(f));
      if (bad) {
        this.$emit('bad-extension');
      } else {
        this.buildFileObjects(files);
      }
    },
    handleFileUpload(event: Event) {
      const input = event.target as HTMLInputElement;
      if (!input.files) return;
      const files = Array.from(input.files);
      const bad = files.some((f) => !fileHasAcceptedExtension(f));
      if (bad) {
        this.$emit('bad-extension');
      } else {
        this.buildFileObjects(files);
      }
      input.value = '';
    },

  },
});
</script>
<style>
.menu {
  position: fixed;
  z-index: 9999;
  padding: 5px;
}
.menu div {
  cursor: pointer;
  padding: 5px;
}
</style>
