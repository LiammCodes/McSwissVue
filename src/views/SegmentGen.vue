<template>
  <mc-file-upload v-if="showFileUpload" action="create segments for" @files-uploaded="handleFilesUploaded" />
  <div v-else class="m-2 h-full" style="overflow-x: hidden;">
    <div class="grid grid-cols-8 gap-2 h-full">
      <!-- file grid col -->
      <mc-file-grid class="col-span-4" :files="files" @file-selected="handleFileSelected" @files-loaded="handleFilesLoaded">
        <template v-slot:spacing>
          <div class="h-full"></div>
        </template>
      </mc-file-grid>
      <!-- segment list col -->
      <div class="col-span-2 flex flex-wrap gap-2 justify-start items-start bg-base-200 rounded-xl p-2" style="height:100%">
        <div class="h-full">
          <mc-segment></mc-segment>
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
import { FileData, Segment } from '../types/Types';
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
import TimeInput from '../components/TimeInput.vue';
import McMetaDataColumn from '../components/McMetaDataColumn.vue';

export default defineComponent({
  name: 'SegmentGen',
  components: { McBinaryModal, McDataIntake, McFileUpload, McFileGrid, McMetaDataColumn, McSegment, TimeInput },
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
      segments: [{
        startTime: '00:00:00',
        endTime: '00:00:00',
      }] as Segment[],
      shortestDuration: null as null | number,
      showFileUpload: true as boolean,
      successToastMessage: '' as string,
    }
  },
  mounted() {
    this.appStore.setSelectedTool('Segment Generator');
  },
  methods: {
    handleFilesUploaded(uploadedFiles: File[]){
      this.files.push(...uploadedFiles);
      this.showFileUpload = false;
      this.selectedFile.file = this.files[0];
    },

    getShortestVideoDuration,

    handleFilesLoaded(fileObjects: object[]) {
      this.filesLoading = false
      this.setSuccessToastMsg(this.segments.length)
      
      // get shortest video durration
      // (this will set the maximum allowed preview durration)
      this.shortestDuration = getShortestVideoDuration(fileObjects);
    },

    handleFileSelected(file: any) {
      this.selectedFile = file;
    },

    setSuccessToastMsg(numFiles: number) {
      if (numFiles === 1) {
        this.successToastMessage = numFiles + ' Segment Generated Successfully  🎉'
      } 
      else {
        this.successToastMessage = numFiles + ' Segments Generated Successfully  🎉'
      }
    },

    async setOutputPath() {
      await this.ipcRenderer.invoke('dialog').then((result: string) => {
        console.log(result)
        this.outputFilePath = result;
      })
    },

    handleGenerate() {

    }

  }
});
</script>