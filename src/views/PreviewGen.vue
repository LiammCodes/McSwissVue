<template>
  <mc-file-upload v-if="showFileUpload" action="create previews for" @files-uploaded="handleFilesUploaded" />
  <div v-else class="m-2 h-full" style="overflow-x: hidden;">
    <Toast :message="'Please enter a valid start and end time'" kind="alert-error" :showToast="showToast" @close="showToast = false"  />
    <div class="grid grid-cols-4 gap-2 h-full">
      <div class="col-span-3 h-full">
        <mc-file-grid :files="files" @file-selected="handleFileSelected" @files-loaded="filesLoading = false">
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
  <div v-if="!showFileUpload" class="flex justify-between items-center gap-10 bg-base-200 rounded-xl p-3 bottom-0 mx-2">
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
      showFileUpload: true as boolean,
      showToast: false,
      startTime: '00:00:00' as string,
      tempDir: '' as string,
      toast: {
        message: '' as string,
        kind: '' as string,
      },
      appPath: '' as string
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
    generatePreviews() {
      this.showToast = !this.showToast;
      console.log(this.startTime)
      console.log(this.endTime)
      if (this.endTime === '00:00:00') {
        console.log('toast');
      } else {
        this.files.forEach((file:File) => {
          const ffmpegCommand = [
            '-i', file.path,
            '-ss', this.startTime,
            '-to', this.endTime,
            '-b:v', '3000k',
            this.path.join(this.outputFilePath, this.removeExtension(file.name) + " Prev" + this.outputFormat)
          ]
          console.log("COMMAND:")
          console.log(ffmpegCommand)

          //@ts-ignore
          // const childProcess = this.spawn(this.pathToFfmpeg, ['-ss', this.startTime, '-y', '-i', file.path, '-codec', 'copy', '-t', this.endTime, this.path.join(this.outputFilePath, this.removeExtension(file.name) + " Prev" + this.outputFormat)])
          const childProcess = this.spawn(this.pathToFfmpeg, ffmpegCommand)
          childProcess.stdout.on('data', (data: any) => {
            console.log(`FFMpeg stdout: ${data}`);
          });
          childProcess.on('close', (code: any) => {
            new window.Notification('Previews Complete', { body: `child process close all stdio with code ${code}` })
          });
          childProcess.stderr.on( 'data', (data: any) => {
            console.log( `stderr: ${data}` );
          });
        })
      }
      
    },
  }
});
</script>
<style>

</style>