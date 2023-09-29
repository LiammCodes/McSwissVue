<template>
  <mc-file-upload v-if="showFileUpload" action="create segments for" @files-uploaded="handleFilesUploaded" />
  <div v-else class="m-2 h-full" style="overflow-x: hidden;">
    <div class="grid grid-cols-4 gap-2 h-full">
      <div class="col-span-3 h-full">
        <mc-file-grid :files="files" @file-selected="handleFileSelected">
        <template v-slot:spacing>
          <div class="h-full"></div>
        </template>
        </mc-file-grid>
      </div>

      <div class="col-span-1 gap-2 bg-base-200 rounded-xl p-2">
        <div class="gap-4 bg-base-200 m-1 rounded-xl">
          <div v-if="selectedFile.thumbnailPath !== ''">
            <img :src="selectedFile.thumbnailPath" class="rounded-md object-cover"/>
          </div>
          <div class="pt-5 space-y-3">
            <p style="word-break: break-all;">Name: {{ selectedFile.file.name }}</p>
            <p>Duration: {{ selectedFile.duration }}</p>
            <p>Bitrate: {{ selectedFile.bitrate }}</p>
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
  async mounted() {
    // "daisyui": "^2.51.5",
    this.appStore.setSelectedTool('Preview Generator');

    await this.ipcRenderer.invoke('get-app-path').then((result: any) => {
      this.tempDir = this.path.join(result, '/src/temp');
    })

  },
  methods: {
    handleFilesUploaded(uploadedFiles: File[]){
      this.files.push(...uploadedFiles);
      this.showFileUpload = false;
      this.selectedFile.file = this.files[0];
    },
    async handleFileSelected(file: object) {
      // @ts-ignore
      this.selectedFile = file;
      // TESTING
      console.log(this.startTime)
      console.log(this.endTime)
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