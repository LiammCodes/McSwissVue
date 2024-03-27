<template>
  <mc-file-upload 
    v-if="showFileUpload" 
    action="convert" 
    @files-uploaded="handleFilesUploaded" 
    @bad-extension="handleBadExtension"
  />
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
            <div class="flex items-center w-full space-x-2">
              <div class="text-right w-16">
                <span>Format:</span>
              </div>
              <div class="dropdown dropdown-top">
                <div tabindex="0" role="button" class="btn btn-sm bg-base-100 w-24" style="text-transform: none;">{{ outputFileExtension }}</div>
                <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52 mb-2">
                  <li @click="handleFormatSelect('.mp4')"><a>.mp4</a></li>
                  <li @click="handleFormatSelect('.mov')"><a>.mov</a></li>
                  <li @click="handleFormatSelect('.m4v')"><a>.m4v</a></li>
                </ul>
              </div>
            </div> 
          </div>

          <div class="flex justify-end items-center space-x-2">
            <div class="flex items-center w-full justify-between space-x-2">
              <div class="text-right w-16">
                <span>Bitrate:</span>
              </div>
              <input
                type="text"
                v-model="bitrate"
                class="input input-sm focus:outline-none w-24 text-center"
              />
              <span>kb/s</span>
            </div> 
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
          <span>Converting...</span>
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
  parseFfmpegConvertProgress,
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
    const ffprobe = require('ffprobe-static');
    const spawn = require('child_process').spawn;
    const ipcRenderer = require('electron').ipcRenderer;
    const dialog = require('electron').dialog;
    const path = require('path');
    const fs = require('fs');
    return { appRootDir, appStore, dialog, fs, ipcRenderer, os, path, ffmpeg, ffprobe, spawn }
  },
  data(){
    return {
      binaryModalResolver: null as (() => void) | null,
      bitrate: '3000' as string,
      errorMessage: '' as string,
      files: ref<File[]>([]),
      filesLoading: true as boolean,
      formatDropdownOpen: false as boolean,
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
      tempDir: '' as string,
      toast: {} as Toast,
      toastMessage: '' as string,
      successToastMessage: '' as string,
    }
  },
  mounted() {
    this.appStore.setSelectedView('Video Converter');
  },
  methods: {
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
    },
    handleFormatSelect(format: string) {
      this.outputFileExtension = format;
      this.formatDropdownOpen = false;
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

    handleFilesLoaded(fileObjects: object[]) {
      this.filesLoading = false
      this.setSuccessToastMsg(fileObjects.length)
      
      // get shortest video durration
      // (this will set the maximum allowed preview durration)
      this.shortestDuration = getShortestVideoDuration(fileObjects);
    },

    async setOutputPath() {
      await this.ipcRenderer.invoke('dialog').then((result: string) => {
        this.outputFilePath = result;
      })
    },

    errorsFlagged(): boolean {
      console.log('checking')
      if (!(/^\d+$/.test(this.bitrate))) {
        this.toastMessage = 'Please enter a valid bitrate';
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
      this.$emit('toggle-toast', this.toast);
      new window.Notification('Preview Generation Complete', { body: this.successToastMessage });
    },

    anyVideosExists(): boolean {
      for (const file of this.files) {
        if (fileAlreadyExists(removeExtension(file.name), this.outputFilePath, this.outputFileExtension)) {
          return true;
        }
      }
      return false;
    },

    async convertVideos() {
      // check if any new files already exist
      if (this.anyVideosExists()) {
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
          '-i', file.path, // Input file
          '-c:v', 'h264', // Video codec
          '-c:a', 'aac', // Audio codec
          '-strict', 'experimental', // Required for AAC codec
          '-b:v', this.bitrate + 'k',
          '-preset', 'veryfast',
          '-b:a', '128k', // Audio bitrate
          this.path.join(this.outputFilePath, this.removeExtension(file.name) + this.outputFileExtension) // Output file
        ];


        this.generating = true;
        const childProcess = this.spawn(this.ffmpeg.replace('app.asar', 'app.asar.unpacked'), ffmpegCommand);
        
        if (childProcess) { // Check if childProcess is not null
          childProcess.stdout.on('data', (data: any) => {
            
          });
          childProcess.stderr.on('data', async (data: any) => {
            const message = data.toString().trim();
            console.log(message)
            if (message.includes('Overwrite? [y/N]')) {
              const overwrite: string = this.overwriteResponse ? 'y' : 'n';
              childProcess.stdin.write(overwrite + '\n');
            } 
            
            if (this.progress < 100) { // VERY unfortunate bug lol, this is a bandaid
              this.progress = this.parseFfmpegConvertProgress(data, file.size);
            }
            console.log(this.progress)
          });
          childProcess.on('close', (code: any) => this.handleGenerationComplete(code));
          childProcess.on('error', (err: any) => {
            // console.log(err)
          });
        } else {
          console.error('Failed to spawn FFMpeg process.');
        }
      });
      
    }
  }
});
</script>
<style scoped>
</style>