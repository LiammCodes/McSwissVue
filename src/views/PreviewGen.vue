<template>
  <mc-file-upload v-if="showFileUpload" action="create previews for" @files-uploaded="handleFilesUploaded" />
  <div v-else class="m-2 h-full" style="overflow-x: hidden;">
    <mc-binary-modal :show-modal="showBinaryModal" @response="handleOverwriteResponse" />
    <div class="grid grid-cols-4 gap-2 h-full">
      <!-- file grid col -->
      <mc-file-grid class="col-span-3 h-full" :files="files" @file-selected="handleFileSelected" @files-loaded="handleFilesLoaded">
        <template v-slot:spacing>
          <div class="h-full"></div>
        </template>
      </mc-file-grid>
      <!-- metadata col -->
      <mc-meta-data-column class="col-span-1 gap-2 bg-base-200 rounded-xl" :files-loading="filesLoading" :selected-file="selectedFile" />
    </div>
  </div>

  <mc-data-intake v-if="!showFileUpload">
    <template v-slot:data-intake>
      <div v-if="!generating" class="flex justify-between items-center gap-10">
        <div class="space-y-2">
          <div class="flex justify-end items-center space-x-2">
            <mc-time-input
              v-model="startTime"
              label="Start timestamp"
            />
          </div>
          <div class="flex justify-end items-center space-x-2">
            <mc-time-input
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
        <label class="btn btn-primary" @click="handleGenerate()">
          generate
        </label>
      </div>
      <div class="py-3" v-else>
        <div class="mb-2 text-base font-medium flex justify-between">
          <span>Generating Previews...</span>
          <span>{{ Math.floor(progress) }}%</span>
        </div>
        <div class="w-full bg-base-100 rounded-full h-2.5">
          <div class="bg-primary h-2.5 rounded-full" :style="'width: ' + progress + '%; transition: width 0.3s ease-in-out;'"></div>
        </div>
      </div>
    </template>
  </mc-data-intake>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useAppStore } from '../stores/appStore';
import { FileData, Toast } from '../types/Types';
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
import McBinaryModal from '../components/modals/McBinaryModal.vue';
import McTimeInput from '../components/McTimeInput.vue';
import McMetaDataColumn from '../components/McMetaDataColumn.vue';


export default defineComponent({
  name: 'PreviewGen',
  components: { McBinaryModal, McDataIntake, McFileUpload, McFileGrid, McMetaDataColumn, McTimeInput },
  setup() {
    const appRootDir = require('app-root-dir').get();
    const appStore = useAppStore();
    const os = require('os');
    const pathToFfmpeg = require('ffmpeg-static');
    const pathToFfprobe = require('ffprobe-static');
    const spawn = require('child_process').spawn;
    const ipcRenderer = require('electron').ipcRenderer;
    const dialog = require('electron').dialog;
    const path = require('path');
    const fs = require('fs');
    return { appRootDir, appStore, dialog, fs, ipcRenderer, os, path, pathToFfmpeg, pathToFfprobe, spawn }
  },
  data(){
    return {
      binaryModalResolver: null as (() => void) | null,
      endTime: '00:00:00' as string,
      errorMessage: '' as string,
      files: ref<File[]>([]),
      filesLoading: true as boolean,
      generating: false as boolean,
      outputFilePath: 'None' as string,
      outputFileExtension: '.mp4' as string,
      overwriteResponse: null as null | boolean,
      progress: 0 as number,
      selectedFile: {
        bitrate: '' as string,
        duration: '' as string,
        file: null as null | File,
        thumbnailPath: '' as string
      } as FileData,
      shortestDuration: null as null | number,
      showBinaryModal: false as boolean,
      showFileUpload: true as boolean,
      showToast: false,
      startTime: '00:00:00' as string,
      tempDir: '' as string,
      toast: {} as Toast,
      toastMessage: '' as string,
      successToastMessage: '' as string,
    }
  },
  watch:{},
  emits: ['toggle-toast'],
  mounted() {
    this.appStore.setSelectedTool('Preview Generator');
  },
  methods: {
    handleFilesUploaded(uploadedFiles: File[]){
      this.files.push(...uploadedFiles);
      this.showFileUpload = false;
      this.selectedFile.file = this.files[0];
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
        this.successToastMessage = numFiles + ' Preview Generated Successfully  🎉'
      } 
      else {
        this.successToastMessage = numFiles + ' Previews Generated Successfully  🎉'
      }
    },

    handleFilesLoaded(fileObjects: object[]) {
      this.filesLoading = false
      this.setSuccessToastMsg(fileObjects.length)
      
      // get shortest video durration
      // (this will set the maximum allowed preview durration)
      this.shortestDuration = getShortestVideoDuration(fileObjects);
    },

    async setOutputPath() {
      await this.ipcRenderer.invoke('dialog').then((result: string) => {
        console.log(result)
        this.outputFilePath = result;
      })
    },

    errorsFlagged(): boolean {
      const clipDuration = this.getSeconds(this.endTime) - this.getSeconds(this.startTime);
      if (this.endTime === '00:00:00' || this.getSeconds(this.startTime) > this.getSeconds(this.endTime) 
          || clipDuration > this.shortestDuration!) {
      
        this.toastMessage = 'Please enter a valid start and end time';
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

    parseFFmpegProgress,
    
    removeExtension,

    getShortestVideoDuration,

    toggleToast(toast: Toast): void {
      this.$emit('toggle-toast', toast)
    },

    async handleGenerate() {
      if (!this.errorsFlagged()) {
        await this.generatePreviews();
      } else {
        this.toast = {
          message: this.toastMessage,
          kind: 'alert-error',
          timeout: 3000
        }
        this.toggleToast(this.toast);
      }
    },

    handleGenerationComplete(code: any) {
      this.generating = false;
      this.progress = 0;

      if (this.overwriteResponse || this.overwriteResponse === null) {
        this.toastMessage = this.successToastMessage;
      } else {
        this.toastMessage = 'Preview generation aborted.';
      }

      this.toast = {
        message: this.overwriteResponse ? this.successToastMessage : this.toastMessage,
        kind: 'alert-success',
        timeout: 5000,
      }
      
      this.toggleToast(this.toast);
      new window.Notification('Previews Complete', { body: `child process close all stdio with code ${code}` });
    },

    async generatePreviews() {
      // check if any new files already exist
      if (this.fileAlreadyExists(this.files, this.outputFilePath, this.outputFileExtension)) {
        // Toggle the modal
        this.showBinaryModal = true;

        // Wait for the modal to close before triggering the action
        await new Promise((resolve) => {
          // @ts-ignore
          this.binaryModalResolver = resolve;
        });
      } 

      this.files.forEach((file: any) => {
        const ffmpegCommand = [
          '-i', file.path,
          '-ss', this.startTime,
          '-to', this.endTime,
          '-b:v', '3000k',
          '-progress', 'pipe:1',
          this.path.join(this.outputFilePath, this.removeExtension(file.name) + " Prev" + this.outputFileExtension)
        ];

        this.generating = true;
        const childProcess = this.spawn(this.pathToFfmpeg, ffmpegCommand);
        
        if (childProcess) { // Check if childProcess is not null
          childProcess.stdout.on('data', (data: any) => {
            this.progress = this.parseFFmpegProgress(data, this.startTime, this.endTime);
          });
          childProcess.stderr.on('data', async (data: any) => {
            const message = data.toString().trim();

            if (message.includes('Overwrite? [y/N]')) {
              const overwrite: string = this.overwriteResponse ? 'y' : 'n';
              childProcess.stdin.write(overwrite + '\n');
            } 
          });
          childProcess.on('close', (code: any) => this.handleGenerationComplete(code));
          childProcess.on('error', (err: any) => {
            // pass
          });
        } else {
          console.error('Failed to spawn FFMpeg process.');
        }
      });
      
    }
  }
});
</script>
<style>
/* Progress indicator styles */
.progress-indicator {
  height: 100%; /* Set the height to fill the container vertically */
  border-radius: 4px; /* Add border radius for rounded corners */
  transition: width 0.3s ease-in-out; /* Add transition for smooth animation */
}
</style>