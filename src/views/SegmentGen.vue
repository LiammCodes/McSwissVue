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
      <mc-file-grid 
        class="col-span-4" 
        :files="files" 
        :processing="generating"
        @file-selected="handleFileSelected" 
        @files-loaded="handleFilesLoaded"
      >
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
            <button class="btn btn-outline btn-primary w-full" @click="addSegment">
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
        <div class="flex items-center space-x-2">
          <div class="text-right w-16">
            <span>Method:</span>
          </div>
          <div class="dropdown dropdown-top">
            <div tabindex="0" role="button" class="btn btn-sm bg-base-100 w-64" style="text-transform: none;">{{ selectedSuffix.label }}</div>
            <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-64 mb-2">
              <li 
                v-for="(suffix, index) in suffixOptions" 
                :key="index"
                @click="handleSuffixSelect(suffix)"
              >
                <a>{{ suffix.label }}</a>  
              </li>
            </ul>
          </div>
        </div> 
        <label class="btn btn-primary" @click="handleGenerate()">
          generate
        </label>
      </div>
      <div class="py-3" v-else>
        <div class="mb-2 text-base font-medium flex justify-between">
          <span>Generating Segments...</span>
          <span>{{ Math.floor(progressStr) }}%</span>
        </div>
        <div class="w-full bg-base-100 rounded-full h-2.5">
          <div class="bg-primary h-2.5 rounded-full" :style="'width: ' + progressStr + '%; transition: width 0.3s ease-in-out;'"></div>
        </div>
      </div>
    </template>
  </mc-data-intake>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useAppStore } from '../stores/appStore';
import { FileData, Segment, SelectOption, Toast } from '../types/Types';
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

      largestEndTime: '' as string,
      smallestStartTime: '' as string,

      largestTimeDenominator: null as null | number,
      currentProgress: 0 as number,
      totalProgress: 0 as number,
      selectedFile: {
        bitrate: '' as string,
        duration: '' as string,
        file: null as null | File,
        thumbnailPath: '' as string
      } as FileData,
      segments: [] as Segment[],
      selectedSuffix: {
        label: "Numbers",
        value: "numbers"
      } as SelectOption,
      shortestDuration: null as null | number,
      showBinaryModal: false as boolean,
      showFileUpload: true as boolean,
      suffixOptions: [
        {
          label: "Letters",
          value: "letters"
        },
        {
          label: "Numbers",
          value: "numbers"
        }
      ] as SelectOption[],
      successToastMessage: '' as string,
      toast: {} as Toast,
      toastMessage: '' as string,
    }
  },
  watch: {
    currentProgress(newVal: number, oldVal: number) {
      if (newVal < oldVal) {
        this.totalProgress += 100;
      }
    }
  },
  mounted() {
    this.setOutputPathFromStorage();
    this.setSuffixFromStorage();
  },
  computed: {
    progressStr() {
      return (this.currentProgress + this.totalProgress) / this.segments.length;
    }
  },
  methods: {
    fileAlreadyExists,
    getSeconds,
    getShortestVideoDuration,
    parseFFmpegProgress,
    removeExtension,
    
    setOutputPathFromStorage() {
      if (this.appStore.segOutputPath) {
        this.outputFilePath = this.appStore.segOutputPath;
      }
    },
    setSuffixFromStorage() {
      if (this.appStore.segSuffix) {
        if (this.appStore.segSuffix === "letters") {
          this.selectedSuffix = this.suffixOptions[0];
        } else {
          this.selectedSuffix = this.suffixOptions[1];
        }
      }
    },

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

    handleSuffixSelect(suffix: SelectOption) {
      this.selectedSuffix = suffix;
      this.appStore.setSegSuffix(suffix.value);
      this.segments.forEach((segment: Segment) => {
        const fileSuffix = this.selectedSuffix.value === "letters" ? String.fromCharCode(segment.id+97) : segment.id + 1;
        console.log(segment.name)
        segment.name = this.removeExtension(this.files[0].name) + "_" + fileSuffix + this.outputFileExtension
      });
    },

    handleFilesUploaded(uploadedFiles: File[]) {
      // ensures file data is available for metadata
      process.nextTick(() => {
        this.files.push(...uploadedFiles);
        this.showFileUpload = false;
        this.selectedFile.file = this.files[0];
        this.addSegment()
      });
    },

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
        this.outputFilePath = result;
        this.appStore.setSegOutputPath(result);
      })
    },

    addSegment() {
      // set new id for segment
      const suffix = this.selectedSuffix.value === "letters" ? String.fromCharCode(this.segments.length+97) : this.segments.length + 1;
      
      this.segments.push({
        name: this.removeExtension(this.files[0].name) + "_" + suffix + this.outputFileExtension,
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

    anySegmentExists(): boolean {
      for (const segment of this.segments) {
        const newFile = removeExtension(segment.name) + this.outputFileExtension;
        const newFilePath = this.path.join(this.outputFilePath, newFile);
        if (fileAlreadyExists(newFilePath)) {
          return true;
        }
      }
      return false;
    },

    async generateSegments() {
      // check if any new files already exist
      if (this.anySegmentExists()) {
        // Toggle the modal
        this.showBinaryModal = true;

        // Wait for the modal to close before triggering the action
        await new Promise((resolve) => {
          // @ts-ignore
          this.binaryModalResolver = resolve;
        });
      } 

      if (this.overwriteResponse || this.overwriteResponse === null) {
        // Variable to keep track of the current segment index
        let currentSegmentIndex = 0;

        // Function to process the next segment recursively
        const processNextSegment = async () => {
          if (currentSegmentIndex < this.segments.length) {
            const segment = this.segments[currentSegmentIndex];
            const segmentSuffix = this.selectedSuffix.value === "letters" ? String.fromCharCode(currentSegmentIndex + 97) : currentSegmentIndex + 1; 
            const ffmpegCommand = [
              // @ts-ignore
              '-i', this.files[0].path,
              '-ss', segment.startTime,
              '-to', segment.endTime,
              '-b:v', '3000k',
              '-progress', 'pipe:1',
              this.path.join(this.outputFilePath, this.removeExtension(this.files[0].name) + "_" + segmentSuffix + this.outputFileExtension)
            ];

            this.generating = true;
            const childProcess = this.spawn(this.ffmpeg.replace('app.asar', 'app.asar.unpacked'), ffmpegCommand);
            
            if (childProcess) { // Check if childProcess is not null
              childProcess.stdout.on('data', (data: any) => {
                const pattern = /out_time=(\d+:\d+:\d+\.\d+)/;
                this.currentProgress = this.parseFFmpegProgress(data, segment.startTime, segment.endTime, pattern);                
              });
              childProcess.stderr.on('data', async (data: any) => {
                const message = data.toString().trim();
                if (message.includes('Overwrite? [y/N]')) {
                  const overwrite: string = this.overwriteResponse ? 'y' : 'n';
                  childProcess.stdin.write(overwrite + '\n');
                } 
              });
              childProcess.on('close', (code: any) => {
                currentSegmentIndex++;
                processNextSegment(); // Process the next segment recursively
              });
              childProcess.on('error', (err: any) => {
                // pass
              });
            } else {
              console.error('Failed to spawn FFMpeg process.');
              currentSegmentIndex++;
              processNextSegment(); // Process the next segment recursively
            }
          } else {
            this.handleGenerationComplete(); // All segments processed, handle generation completion
          }
        };

        // Start processing the first segment
        await processNextSegment();
      } else {
        this.handleGenerationComplete();
      }
    },

    handleGenerationComplete() {
      this.setSuccessToastMsg(this.segments.length)
      this.generating = false;
      this.totalProgress = 0;
      this.currentProgress = 0;

      if (this.overwriteResponse || this.overwriteResponse === null) {
        this.toastMessage = this.successToastMessage;
      } else {
        this.toastMessage = 'Segment generation aborted.';
      }

      this.toast = {
        message: this.overwriteResponse ? this.successToastMessage : this.toastMessage,
        kind: 'alert-success',
        timeout: 5000,
      }
      this.$emit('toggle-toast', this.toast);
      new window.Notification('Segment Generation Complete', { body: this.successToastMessage });
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