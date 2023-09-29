<template>
  <mc-file-upload v-if="showFileUpload" action="create previews for" @files-uploaded="handleFilesUploaded" />
  <div v-else class="m-2 h-full" style="overflow-x: hidden;">
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
            <p class="text-lg font-bold" style="word-break: break-all;">{{ selectedFile.file!.name }}</p>
            <div class="bg-base-100 rounded-md text-sm p-2 space-y-3 mt-3">
              <p>Duration: <span class="float-right">{{ selectedFile.duration }}</span></p>
              <p>Size: <span class="float-right">{{ formatedFileSize(+selectedFile.size) }}</span></p>
              <p>Bitrate: <span class="float-right">{{ selectedFile.bitrate }}</span></p>
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
        <span>Output: </span><input type="text" readonly placeholder="None" class="input input-sm w-full border focus:outline-none" />
        <label class="btn btn-sm btn-ghost border border-base-content" @click="setOutputDir">browse</label>
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
import { VideoCameraIcon, PhotoIcon } from '@heroicons/vue/24/outline';
import McFileUpload from '../components/McFileUpload.vue';
import McFileGrid from '../components/McFileGrid.vue';
import TimeInput from '../components/TimeInput.vue';

export default defineComponent({
  components: { McFileUpload, McFileGrid, TimeInput, VideoCameraIcon, PhotoIcon },
  name: 'PreviewGen',
  setup() {
    const appRootDir = require('app-root-dir').get();
    const appStore = useAppStore();
    const pathToFfmpeg = require('ffmpeg-static');
    const pathToFfprobe = require('ffprobe-static');
    const spawn = require('child_process').spawn;
    const ipcRenderer = require('electron').ipcRenderer;
    const path = require('path');

    return { ipcRenderer, appRootDir, appStore, spawn, pathToFfmpeg, pathToFfprobe, path }
  },
  data(){
    return {
      endTime: '' as string,
      files: ref<File[]>([]),
      filesLoading: true as boolean,
      loadingMetaData: false as boolean,
      outputFilePath: '' as string,
      selectedFile: {
        bitrate: '' as string,
        duration: '' as string,
        file: null as null | File,
        thumbnailPath: '' as string
      },
      showFileUpload: true as boolean,
      startTime: '' as string,
      tempDir: '' as string,
      appPath: '' as string
    }
  },
  watch:{
    startTime(newTime: any) {
      console.log(newTime)
    },
    endTime(newTime: any) {
      console.log(newTime)
    }
  },
  computed: {
    

  },
  async mounted() {
    // "daisyui": "^2.51.5",
    this.appStore.setSelectedTool('Preview Generator');

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

    async setOutputDir() {

    },
    generatePreviews() {
      //@ts-ignore
      const childProcess = this.spawn(this.pathToFfmpeg, ['-ss', this.startTime, '-y', '-i', file.path, '-codec', 'copy', '-t', this.endTime, path.join(this.tempDir, 'output.png')])
      childProcess.stdout.on('data', (data: any) => {
        console.log(`FFMpeg stdout: ${data}`);
      });
      childProcess.on('close', (code: any) => {
        new window.Notification('Previews Complete', { body: `child process close all stdio with code ${code}` })
      });
      childProcess.stderr.on( 'data', (data: any) => {
        console.log( `stderr: ${data}` );
      });
    },
  }
});
</script>