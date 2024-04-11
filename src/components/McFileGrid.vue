<template>
  <div class="bg-base-200 rounded-xl p-2 px-3 flex h-full" style="overflow-y: auto; overflow-x: hidden;">
    <div v-if="filesLoading || fileObjects == null" class="flex items-center justify-center h-full w-full">
      <span class="loading loading-spinner text-primary loading-lg"></span>
    </div>
    <div v-else-if="list" class="w-full">
      <button 
        v-for="fileObj, index in fileObjects"
        :key="fileObj.file!.name"
        class="w-full p-2 my-1 rounded-md hover:bg-base-300 focus:outline-none focus:bg-base-300"
        ref="fileBtns"
        @click="handleFileSelection(fileObj)"
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
        v-for="fileObj in fileObjects"
        :key="fileObj.file!.name"
        class="w-32 items-center p-2 m-1 rounded-xl hover:bg-base-300 focus:outline-none focus:ring focus:ring-primary"
        ref="fileBtns"
        @click="handleFileSelection(fileObj)"
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
import { defineComponent, PropType, } from "vue";
import { FileData, MethodOption, Status } from "../types/Types";

export default defineComponent({
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
    fileStatuses: {
      type: Array as PropType<Status[]>,
      required: false,
      default: [],
    },
    method: {
      type: Object as PropType<MethodOption>,
      required: false,
      default: {}
    }
  },

  setup() {
    const ipcRenderer = require('electron').ipcRenderer;
    const path = require('path');
    const ffmpeg = require('ffmpeg-static');
    const ffprobe = require('ffprobe-static').path;
    const spawn = require('child_process').spawn;
    const fs = require('fs');

    return { ipcRenderer, path, ffmpeg, ffprobe, spawn, fs }
  },

  data() {
    return {
      fileObjects: [] as FileData[],
      filesLoading: true as boolean,
      tempPath: '' as string,
      ffmpegPath: '' as string,
      ffprobePath: '' as string,
    }
  },

  async mounted() {
    await this.setTempDirectory();
    await this.buildFileObjects(this.files);
    this.handleFileSelection(this.fileObjects[0])
    this.selectFirstFile();
    this.filesLoaded();
  },
  computed: {
    progressStatusDenominator() {
      if (this.method && this.method.value === "upload") {
        return 5;
      } else {
        return 4;
      }
    }
  },
  methods: {
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
      await this.ipcRenderer.invoke('get-app-path').then((result: any) => {
        this.tempPath = this.path.join(result);
      })
    },

    getStatusColor(index: number) {
      return this.fileStatuses[index].color
    },

    async buildFileObjects(files: File[]) {
      this.filesLoading = true;
      try {
        // Use Promise.all to process all files concurrently
        const fileProcessingPromises = files.map(async (file: File) => {
          const metadata = await this.getMetaData(file);
          const thumbnailPath = await this.generateThumbnail(file, this.calculateTimeMidpoint(metadata.duration));
          const fileObj = {
            bitrate: metadata.bitrate,
            duration: metadata.duration,
            file: file,
            thumbnailPath: thumbnailPath,
            size: metadata.size,
          }
          return fileObj;
        });

        const fileObjects = await Promise.all(fileProcessingPromises)
        this.filesLoading = false;
        this.fileObjects = fileObjects;
        
      } catch (error) {
        console.error('Error:', error);
      }
    },

    async generateThumbnail(file: File, cutTime: string): Promise<string> {
      return new Promise<string>((resolve, reject) => {
        const thumbnailFileName = this.path.basename(file.name, this.path.extname(file.name)) + ".png";
        // @ts-ignore
        const childProcess = this.spawn(this.ffmpeg.replace('app.asar', 'app.asar.unpacked'), ['-y', '-ss', cutTime, '-i', file.path, '-frames:v', '1', this.path.join(this.tempPath, thumbnailFileName)]);
        
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
      return new Promise<{ bitrate: string; duration: string, size: string }>((resolve, reject) => {
        const result = {
          bitrate: '' as string,
          duration: '' as string,
          size: '' as string,
        };
        // @ts-ignore
        const childProcess = this.spawn(this.ffprobe.replace('app.asar', 'app.asar.unpacked'), [
          '-i', 
          file.path + '', 
          '-loglevel', 
          'level',
          '-show_entries',
          'format=size', // Request to show the file size.
          '-of',
          'default=noprint_wrappers=1:nokey=1', // Output format.
        ]);
        childProcess.stdout.on('data', (data: any) => {
          // console.log(`FFProbe stdout: ${data}`);
          result.size = data;
        });

        childProcess.stderr.on('data', (data: any) => {
          // console.log(`FFProbe sterr: ${data}`);
          const stderrData = data.toString();
          const durationRegex = /Duration: (\d+:\d+:\d+)/;
          const bitrateRegex = /bitrate: (\d+) kb\/s/;

          const durationMatch = stderrData.match(durationRegex);
          if (durationMatch && durationMatch[1]) {
            result.duration = durationMatch[1];
          }

          const bitrateMatch = stderrData.match(bitrateRegex);
          if (bitrateMatch && bitrateMatch[1]) {
            result.bitrate = bitrateMatch[1] + ' kb/s';
          }
        });

        childProcess.on('close', (code: any) => {
          resolve(result); // Resolve the promise when the child process is closed.
        });

        childProcess.on('error', (error: any) => {
          reject(error); // Reject the promise if an error occurs.
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

    handleFileSelection(fileObj: object) {
      this.$emit('file-selected', fileObj);
    },

    // unused right now
    removeFile(file: File) {
      this.$emit('remove-file', file);
    },
    // unused right now
    openFile(file: File) {
      this.$emit('open-file', file);
    },
  },
});
</script>
