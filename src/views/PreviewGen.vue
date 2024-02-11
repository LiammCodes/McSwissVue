<template>
  <mc-file-upload v-if="showFileUpload" action="create previews for" @files-uploaded="handleFilesUploaded" />
  <div v-else class="m-2 h-full" style="overflow-x: hidden;">
    <mc-binary-modal :show-modal="showBinaryModal" @response="handleOverwriteResponse" />
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
        <mc-meta-data-column :files-loading="filesLoading" :selected-file="selectedFile" />
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
      <div class="mb-2 text-base font-medium flex justify-between">
        <span>Generating Previews...</span>
        <span>{{ Math.floor(progress) }}%</span>
      </div>
      <div class="w-full bg-base-100 rounded-full h-2.5">
        <div class="bg-primary h-2.5 rounded-full" :style="'width: ' + progress + '%; transition: width 0.3s ease-in-out;'"></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useAppStore } from '../stores/appStore';
import { FileData } from '../types/Types';
import { Toast } from '../types/Types';
import McFileUpload from '../components/McFileUpload.vue';
import McFileGrid from '../components/McFileGrid.vue';
import McBinaryModal from '../components/modals/McBinaryModal.vue';
import TimeInput from '../components/TimeInput.vue';
import McMetaDataColumn from '../components/McMetaDataColumn.vue';


export default defineComponent({
  components: { McBinaryModal, McFileUpload, McFileGrid, McMetaDataColumn, TimeInput },
  name: 'PreviewGen',
  setup() {
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
      binaryModalResolver: null as (() => void) | null,
      endTime: '00:00:00' as string,
      errorMessage: '' as string,
      files: ref<File[]>([]),
      filesLoading: true as boolean,
      generating: false as boolean,
      loadingMetaData: false as boolean,
      outputFilePath: 'None' as string,
      outputFormat: '.mp4' as string,
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
      // errorToast: {
      //   message: '',
      //   kind: '',
      //   timeout: 3000
      // } as Toast,
      // successToast: {
      //   message: '', // gets set later based on number of previews being generated
      //   kind: 'alert-success', 
      //   timeout: 5000
      // } as Toast,
      toast: {} as Toast,
      toastMessage: '' as string,
      successToastMessage: '' as string,
    }
  },
  watch:{
    // startTime(newTime: any) {
    //   console.log(newTime)
    // },
    // endTime(newTime: any) {
    //   console.log(newTime)
    // },
    // outputFilePath(newPath: any) {
    //   console.log(newPath)
    // }
  },
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
      fileObjects.forEach((fileObj: any) => {
        if (this.shortestDuration === null || this.getSeconds(fileObj.duration) < this.shortestDuration) {
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
      
        this.toastMessage = 'Please enter a valid start and end time';
        return true;

      } else if (this.outputFilePath === 'None' || this.outputFilePath === null || !this.outputFilePath) {

        this.toastMessage = 'Please enter a valid output path';
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

    toggleToast(toast: Toast): void {
      this.$emit('toggle-toast', toast)
    },

    async generatePreviews() {
      if (!this.errorsFlagged()) {
        this.files.forEach((file: any) => {
          const ffmpegCommand = [
            '-i', file.path,
            '-ss', this.startTime,
            '-to', this.endTime,
            '-b:v', '3000k',
            '-progress', 'pipe:1',
            this.path.join(this.outputFilePath, this.removeExtension(file.name) + " Prev" + this.outputFormat)
          ];
          // console.log("COMMAND:");
          // console.log(ffmpegCommand);

          this.generating = true;

          const childProcess = this.spawn(this.pathToFfmpeg, ffmpegCommand);
          
          if (childProcess) { // Check if childProcess is not null
            childProcess.stdout.on('data', (data: any) => {
              // console.log(`FFMpeg stdout: ${data}`);
              this.progress = (this.getSeconds(this.parseOutTime(data)) / (this.getSeconds(this.endTime) - this.getSeconds(this.startTime))) * 100;
            });

            childProcess.stderr.on('data', async (data: any) => {
              const message = data.toString().trim();
              if (message.includes('Overwrite? [y/N]')) {
                // Toggle the modal
                this.showBinaryModal = true;

                // Wait for the modal to close before triggering the action
                await new Promise((resolve) => {
                  // @ts-ignore
                  this.binaryModalResolver = resolve;
                });
                const overwrite: string = this.overwriteResponse ? 'y' : 'n';
                childProcess.stdin.write(overwrite + '\n');
              } else {
                // console.error(`FFMpeg stderr: ${message}`);
              }
            });

            childProcess.on('close', (code: any) => {
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
            });

            childProcess.on('error', (err: any) => {
              // console.error(`FFMpeg process error: ${err}`);
            });
          } else {
            // console.error('Failed to spawn FFMpeg process.');
          }
        });
      } else {
        this.toast = {
          message: this.toastMessage,
          kind: 'alert-error',
          timeout: 3000
        }
        this.toggleToast(this.toast);
      }
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