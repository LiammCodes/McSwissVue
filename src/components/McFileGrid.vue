<template>
  <div class="bg-base-200 rounded-xl p-2 flex h-full" style="overflow-y: auto; overflow-x: hidden;">
    <div v-if="filesLoading" class="flex items-center justify-center h-full w-full">
      <span class="loading loading-spinner text-primary loading-lg"></span>
    </div>
    <div v-else class="col-span-3 gap-2 justify-start">
      <button 
        v-for="fileObj in fileObjects"
        :key="fileObj.file.name"
        class="w-32 items-center p-2 rounded-xl hover:bg-base-300 focus:outline-none focus:ring focus:ring-primary"
        ref="fileBtns"
        @click="handleFileSelection(fileObj)"
      >
        <div class="flex flex-col items-center">
          <img 
            class="rounded-md object-cover w-22 h-16" 
            :src="fileObj.thumbnailPath"
          />
        </div>
        <p class="text-center break-words text-xs pt-2">{{ shortenFileName(fileObj.file.name, 30) }}</p>
      </button>

    </div>
    <slot name="spacing"/>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { DocumentIcon } from '@heroicons/vue/24/outline';

export default defineComponent({
  props: {
    files: {
      type: Array as PropType<File[]>,
      required: true,
    },
  },
  components: { DocumentIcon },
  setup() {
    const ipcRenderer = require('electron').ipcRenderer;
    const path = require('path');
    const pathToFfmpeg = require('ffmpeg-static');
    const pathToFfprobe = require('ffprobe-static');
    const spawn = require('child_process').spawn;
    const fs = require('fs');

    return { ipcRenderer, path, pathToFfmpeg, pathToFfprobe, spawn, fs }
  },
  data() {
    return {
      fileObjects: [] as object[],
      filesLoading: true as boolean,
      tempPath: '' as string,
    }
  },
  async mounted() {
    await this.setTempDirectory();
    await this.buildFileObjects(this.files);
    this.handleFileSelection(this.fileObjects[0])
    this.selectFirstFile();
    this.filesLoaded();
  },
  methods: {
    selectFirstFile() {
      this.$nextTick(() => {
        // @ts-ignore
        this.$refs.fileBtns[0].focus();
      })
    },

    filesLoaded() {
      this.filesLoading = false;
      this.$emit('files-loaded', !this.filesLoading)
    },

    async setTempDirectory() {
      await this.ipcRenderer.invoke('get-app-path').then((result: any) => {
        this.tempPath = this.path.join(result, '/src/temp');
      })
    },

    async buildFileObjects(files: File[]) {
      this.filesLoading = true;
      try {
        // Use Promise.all to process all files concurrently
        const fileProcessingPromises = files.map(async (file: File) => {
          const metadata = await this.getMetaData(file);
          const thumbnailPath = await this.generateThumbnail(file);

          return {
            bitrate: metadata.bitrate as string,
            duration: metadata.duration as string,
            file: file as File,
            thumbnailPath: thumbnailPath as string,
            size: metadata.size as string,
          };
        });

        const fileObjects = await Promise.all(fileProcessingPromises)
        this.filesLoading = false;
        this.fileObjects = fileObjects;
        
      } catch (error) {
        console.error('Error:', error);
      }
    },

    async generateThumbnail(file: File): Promise<string> {
      return new Promise<string>((resolve, reject) => {
        const thumbnailFileName = this.path.basename(file.name, this.path.extname(file.name)) + ".png";
        // @ts-ignore
        const childProcess = this.spawn(this.pathToFfmpeg, ['-y', '-ss', '00:01:15', '-i', file.path, '-frames:v', '1', this.path.join(this.tempPath, thumbnailFileName)]);
        
        childProcess.on('close', (code: any) => {
          // console.log("created the thumbnail: " + thumbnailFileName);
          resolve(this.path.join('src/temp/' + thumbnailFileName));
        });
        
        childProcess.stderr.on('data', (data: any) => {
          // uncomment to log ffmpeg data to console
          // console.log(`FFMpeg stderr: ${data}`);
        });
      });
    },

    async getMetaData(file: File) {
      return new Promise<{ bitrate: string; duration: string }>((resolve, reject) => {
        const result = {
          bitrate: '' as string,
          duration: '' as string,
          size: '' as string,
        };
        // @ts-ignore
        const childProcess = this.spawn(this.pathToFfprobe.path, [
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

<style scoped>
</style>
