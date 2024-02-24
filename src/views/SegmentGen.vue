<template>
  <mc-file-upload 
    v-if="showFileUpload" 
    action="create segments for" 
    :multiple-files="false" 
    @files-uploaded="handleFilesUploaded" 
    @bad-extension="handleBadExtension"
  />
  <div v-else class="m-2 h-full" style="overflow-x: hidden;">
    <mc-binary-modal :show-modal="showBinaryModal" @response="handleOverwriteResponse" />
    <div class="grid grid-cols-8 gap-2 h-full" style="overflow-x: hidden;">
      <!-- file grid col -->
      <mc-file-grid class="col-span-4" :files="files" @file-selected="handleFileSelected" @files-loaded="handleFilesLoaded">
        <template v-slot:spacing>
          <div class="h-full"></div>
        </template>
      </mc-file-grid>
      <!-- segment list col -->
      <div class="col-span-2 flex flex-wrap gap-2 justify-start items-start rounded-xl h-full" style="overflow-x: hidden;">
        <div class="w-full space-y-2">
          <!-- scrollable list of secments-->
          <div class="max-h-screen space-y-2">
            <mc-segment 
              v-for="segment in segments"
              :key="segment.id"
              :modelValue="segment"
              @delete-segment="deleteSegment(segment.id)"
            />
            <button class="btn btn-neutral w-full" @click="addSegment">
              <plus-circle-icon color="primary" class="h-6 w-6"/>
            </button>
          </div>
        </div>
      </div>
      <!-- metadata col -->
      <mc-meta-data-column class="col-span-2 gap-2 bg-base-200 rounded-xl" :files-loading="filesLoading" :selected-file="selectedFile" />
    </div>
  </div>

  <mc-data-intake v-if="!showFileUpload">
    <template v-slot:data-intake>
      <div v-if="!generating" class="flex justify-between items-center gap-10">
        <div class="space-y-2 flex-grow max-w-xl">
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
import { FileData, Segment, Toast } from '../types/Types';
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

export default defineComponent({
  name: 'SegmentGen',
  components: { McBinaryModal, McDataIntake, McFileUpload, McFileGrid, McMetaDataColumn, McSegment, PlusCircleIcon },
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
  data() {
    return {
      binaryModalResolver: null as (() => void) | null,
      defaultSegment: {
        name: 'Set it later',
        startTime: '00:00:00',
        endTime: '00:00:00'
      } as Segment,
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
      segments: [] as Segment[],
      shortestDuration: null as null | number,
      showBinaryModal: false as boolean,
      showFileUpload: true as boolean,
      successToastMessage: '' as string,
      toast: {} as Toast,
      toastMessage: '' as string
    }
  },
  mounted() {
    this.appStore.setSelectedTool('Segment Generator');
  },
  methods: {
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

    handleFilesUploaded(uploadedFiles: File[]){
      this.files.push(...uploadedFiles);
      this.showFileUpload = false;
      this.selectedFile.file = this.files[0];
      this.addSegment()
    },

    getSeconds,
    
    getShortestVideoDuration,

    handleFilesLoaded(fileObjects: object[]) {
      this.filesLoading = false
      
      // get shortest video durration
      // (this will set the maximum allowed preview durration)
      this.shortestDuration = getShortestVideoDuration(fileObjects);
    },

    handleFileSelected(file: any) {
      this.selectedFile = file;
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
      await this.ipcRenderer.invoke('dialog').then((result: string) => {
        console.log(result)
        this.outputFilePath = result;
      })
    },

    addSegment() {
      // set new id for segment
      this.segments.push({
        name: this.removeExtension(this.files[0].name) + "_" + String.fromCharCode(this.segments.length+97) + this.outputFileExtension,
        startTime: '00:00:00',
        endTime: '00:00:00',
        id: this.segments.length
      });
    },

    deleteSegment(id: number) {
      const index = this.segments.findIndex(segment => segment.id === id);
      if (index !== -1) {
        this.segments.splice(index, 1);
        console.log("Segment deleted:", id);
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

    fileAlreadyExists,
    parseFFmpegProgress,
    removeExtension,

    async generateSegments() {
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
      
      this.segments.forEach((segment: Segment, i: number) => {
        const ffmpegCommand = [
          // @ts-ignore
          '-i', this.files[0].path,
          '-ss', segment.startTime,
          '-to', segment.endTime,
          '-b:v', '3000k',
          '-progress', 'pipe:1',
          this.path.join(this.outputFilePath, this.removeExtension(this.files[0].name) + "_" + String.fromCharCode(i+97) + this.outputFileExtension)
        ];

        this.generating = true;
        const childProcess = this.spawn(this.pathToFfmpeg, ffmpegCommand);
        
        if (childProcess) { // Check if childProcess is not null
          childProcess.stdout.on('data', (data: any) => {
            this.progress = this.parseFFmpegProgress(data, segment.startTime, segment.endTime);
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
    },

    handleGenerationComplete(code: any) {
      this.setSuccessToastMsg(this.segments.length)
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
      new window.Notification('Previews Complete', { body: `child process close all stdio with code ${code}` });
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