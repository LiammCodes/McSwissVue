<template>
  <mc-file-upload v-if="showFileUpload" action="create previews for" @files-uploaded="handleFilesUploaded" />
  <div v-else class="m-2 h-full" style="overflow-x: hidden;">
    <Toast :message="errorMessage" kind="alert-error" :showToast="showToast" @close="showToast = false" :timeout="3000" />
    <div class="grid grid-cols-4 gap-2 h-full">
      <div class="col-span-3 h-full">
        <mc-file-grid :files="files" @file-selected="handleFileSelected" @files-loaded="handleFilesLoaded">
          <template v-slot:spacing>
            <div class="h-full"></div>
          </template>
        </mc-file-grid>
      </div>

      <!-- METADATA COL -->
      <div class="col-span-1 gap-2 bg-base-200 rounded-xl">
        <div v-if="filesLoading" class="flex items-center justify-center h-full w-full">
          <span class="loading loading-dots text-secondary loading-lg"></span>
        </div>
        <div v-else class="gap-4 bg-base-200 rounded-t-xl">
          <div v-if="selectedFile.thumbnailPath !== ''">
            <img :src="selectedFile.thumbnailPath" class="rounded-t-xl object-cover"/>
          </div>
          <div class="p-3">
            <p class="text-base font-bold" style="word-break: break-all;">{{ selectedFile.file!.name }}</p>
            <div class="bg-base-100 rounded-md text-sm p-2 space-y-3 mt-3">
              <p>Duration: <span class="float-right">{{ selectedFile.duration }}</span></p>
              <p>Size: <span class="float-right">{{ formatedFileSize(+selectedFile.size) }}</span></p>
              <p>Bitrate: <span class="float-right">{{ selectedFile.bitrate }}</span></p>
              <!-- TODO: Add type and last modified -->
            </div>
            
          </div>
        </div>
      </div>
    </div>
  </div>

    <div v-if="!showFileUpload" class="bg-base-200 rounded-xl p-3 bottom-0 mx-2">
      <div v-if="!generating" class="flex justify-between items-center gap-10">
        <div class="space-y-2">
          <div class="flex justify-end items-center space-x-2">
            <time-input
              v-model="startTime"
              label="Start timestamp"
            />
          </div>
          <div class="flex justify-end items-center space-x-2">
            <time-input
              v-model="endTime"
              label="End timestamp"
            />
          </div>
        </div>
        <div class="space-y-2 flex-grow max-w-md">
          <div class="flex justify-end items-center space-x-2">
            <span>Output: </span><input type="text" readonly placeholder="None" v-model="outputFilePath" class="input input-sm w-full border focus:outline-none" />
            <label class="btn btn-sm btn-ghost border border-base-content" @click="setOutputPath">browse</label>
          </div>  
        </div>
        <label class="btn btn-primary" @click="generatePreviews">
          generate
        </label>
      </div>

      <div class="py-3" v-else>
        <progress class="progress progress-primary w-full" :value="progress" max="100"></progress>
      </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useAppStore } from '../stores/appStore';
import Toast from '../components/Toast.vue';
import McFileUpload from '../components/McFileUpload.vue';
import McFileGrid from '../components/McFileGrid.vue';
import TimeInput from '../components/TimeInput.vue';

export default defineComponent({
  components: { McFileUpload, McFileGrid, TimeInput, Toast },
  name: 'PreviewGen',
  setup() {
    // const toasted = require('vue-toasted');
    const appRootDir = require('app-root-dir').get();
    const appStore = useAppStore();
    const pathToFfmpeg = require('ffmpeg-static');
    const pathToFfprobe = require('ffprobe-static');
    const spawn = require('child_process').spawn;
    const ipcRenderer = require('electron').ipcRenderer;
    const dialog = require('electron').dialog;
    const path = require('path');
    return { ipcRenderer, appRootDir, appStore, dialog, spawn, pathToFfmpeg, pathToFfprobe, path }
  },
  data(){
    return {
      endTime: '00:00:00' as string,
      errorMessage: '' as string,
      files: ref<File[]>([]),
      filesLoading: true as boolean,
      loadingMetaData: false as boolean,
      outputFilePath: 'None' as string,
      outputFormat: '.mp4' as string,
      selectedFile: {
        bitrate: '' as string,
        duration: '' as string,
        file: null as null | File,
        thumbnailPath: '' as string
      },
      generating: false as boolean,
      shortestDuration: null as null | number,
      showFileUpload: true as boolean,
      showToast: false,
      startTime: '00:00:00' as string,
      tempDir: '' as string,
      toast: {
        message: '' as string,
        kind: '' as string,
      },
      appPath: '' as string,
      progress: 0 as number,
    }
  },
  watch:{
    startTime(newTime: any) {
      console.log(newTime)
    },
    endTime(newTime: any) {
      console.log(newTime)
    },
    outputFilePath(newPath: any) {
      console.log(newPath)
    }
  },
  async mounted() {
    this.appStore.setSelectedTool('Preview Generator');
    // get temp path
    await this.ipcRenderer.invoke('get-app-path').then((result: any) => {
      this.tempDir = this.path.join(result, '/src/temp');
    })
  },
  methods: {
    formatedFileSize(bytes: number) {
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
    handleFilesUploaded(uploadedFiles: File[]){
      this.files.push(...uploadedFiles);
      this.showFileUpload = false;
      this.selectedFile.file = this.files[0];
    },
    handleFileSelected(file: object) {
      // @ts-ignore
      this.selectedFile = file;
    },
    handleFilesLoaded(fileObjects: object[]) {
      this.filesLoading = false
      // get shortest video durration
      // could probably be more efficient lol
      fileObjects.forEach((fileObj: any) => {
        if (this.shortestDuration === null) {
          this.shortestDuration = this.getSeconds(fileObj.duration);
        } else if (this.getSeconds(fileObj.duration) < this.shortestDuration) {
          this.shortestDuration = this.getSeconds(fileObj.duration);
        }
      })
    },
    getSeconds(time: string | null){
      if (time) {
        // Split the input string into hours, minutes, and seconds
        let [hours, minutes, seconds] = time.split(":").map(Number);

        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        return totalSeconds;
      } else {
        return 0;
      }
      
    },
    async setOutputPath() {
      await this.ipcRenderer.invoke('dialog').then((result: string) => {
        console.log(result)
        this.outputFilePath = result;
      })
    },
    removeExtension(filename: string) {
      // Split the filename into base name and extension
      const dotIndex = filename.lastIndexOf('.');
      const baseName = filename.slice(0, dotIndex);
      const extension = filename.slice(dotIndex);

      return baseName;
    },
    errorsFlagged(): boolean {
      const clipDuration = this.getSeconds(this.endTime) - this.getSeconds(this.startTime);
      if (this.endTime === '00:00:00' || this.getSeconds(this.startTime) > this.getSeconds(this.endTime) 
          || clipDuration > this.shortestDuration!) {
        this.errorMessage = 'Please enter a valid start and end time';
        this.showToast = !this.showToast;
        return true;
      } else if (this.outputFilePath === 'None' || this.outputFilePath === null || !this.outputFilePath) {
        this.errorMessage = 'Please enter a valid output path';
        this.showToast = !this.showToast;
        return true;
      } else {
        return false;
      }
    },


    parseOutTime(output: string): string | null {
      if (output) {
        const pattern = /out_time=(\d+:\d+:\d+\.\d+)/;
        const match = RegExp(pattern).exec(output);

        return match ? match[1] : null;  
      } else {
        return null
      }
          
    },


    parseFFmpegProgress(progressStr: string): number | null {
      // Regular expression pattern to extract time and total duration
      const pattern = /time=(\d+):(\d+):(\d+\.\d+).*?duration=(\d+):(\d+):(\d+\.\d+)/;
      
      // Search for the pattern in the progress string
      // @ts-ignore
      const match = RegExp(pattern).exec(progressStr);
      if (match) {
          // Extract hours, minutes, and seconds for current time and total duration
          const currentHours = parseFloat(match[1]);
          const currentMinutes = parseFloat(match[2]);
          const currentSeconds = parseFloat(match[3]);
          const totalHours = parseFloat(match[4]);
          const totalMinutes = parseFloat(match[5]);
          const totalSeconds = parseFloat(match[6]);
          
          // Calculate total duration in seconds and current time in seconds
          const totalDuration = (totalHours * 3600) + (totalMinutes * 60) + totalSeconds;
          const currentTime = (currentHours * 3600) + (currentMinutes * 60) + currentSeconds;
          
          // Calculate progress percentage
          const progressPercentage = (currentTime / totalDuration) * 100;
          return progressPercentage;
      } else {
          return null;
      }
    }, 


    generatePreviews() {
      if (!this.errorsFlagged()) {
        this.files.forEach((file:File) => {
          const ffmpegCommand = [
            '-i', file.path,
            '-ss', this.startTime,
            '-to', this.endTime,
            '-b:v', '3000k',
            '-progress', 'pipe:1',
            this.path.join(this.outputFilePath, this.removeExtension(file.name) + " Prev" + this.outputFormat)
          ]
          console.log("COMMAND:")
          console.log(ffmpegCommand)

          this.generating = true;

          //@ts-ignore
          const childProcess = this.spawn(this.pathToFfmpeg, ffmpegCommand)
          childProcess.stdout.on('data', (data: any) => {
            console.log(`FFMpeg stdout: ${data}`);

            this.progress = (this.getSeconds(this.parseOutTime(data)) / (this.getSeconds(this.endTime) - this.getSeconds(this.startTime))) * 100;

            // console.log(progress + '%')

          });
          childProcess.on('close', (code: any) => {
            this.generating = false;
            new window.Notification('Previews Complete', { body: `child process close all stdio with code ${code}` })
          });
          childProcess.stderr.on( 'data', (data: any) => {
            // console.log( `stderr: ${data}` );
          });
        })
      }
    },
  }
});
</script>
<style>

</style>