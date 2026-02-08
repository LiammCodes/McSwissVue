<template>
  <div class="flex flex-col flex-1 min-h-0 overflow-hidden">
    <mc-file-upload 
      v-if="showFileUpload" 
      action="transcribe" 
      @files-uploaded="handleFilesUploaded" 
      @bad-extension="handleBadExtension"
    />
    <template v-else>
      <div class="flex flex-col flex-1 min-h-0 overflow-hidden">
        <mc-binary-modal :show-modal="showBinaryModal" @response="handleOverwriteResponse" />
        <div class="flex-1 min-h-0 grid grid-cols-4 gap-2 overflow-hidden">
          <mc-file-grid 
            class="col-span-3 h-full" 
            :files="files" 
            :file-statuses="statuses" 
            :list="true" 
            :method="selectedMethod" 
            :processing="transcribing"
            @file-selected="handleFileSelected" 
            @files-loaded="handleFilesLoaded"
          />
          <mc-meta-data-column class="col-span-1 gap-2 bg-base-200 rounded-xl min-h-0" :files-loading="filesLoading" :selected-file="selectedFile" />
        </div>
        <mc-data-intake class="shrink-0">
    <template v-slot:data-intake>
      <div v-if="!transcribing" class="flex justify-between items-center gap-10">
        <div class="flex justify-end items-center space-x-2">
          <div class="flex items-center w-full space-x-2">
            <div class="text-right w-16">
              <span>Method:</span>
            </div>
            <div class="dropdown dropdown-top">
              <div tabindex="0" role="button" class="btn btn-sm bg-base-100 w-64" style="text-transform: none;">{{ selectedMethod.label }}</div>
              <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-64 mb-2">
                <li 
                  v-for="(method, index) in methodOptions" 
                  :key="index"
                  @click="handleMethodSelect(method)"
                >
                  <a>{{ method.label }}</a>  
                </li>
              </ul>
            </div>
          </div> 
        </div>
        <div v-if="selectedMethod.value === 'local'" class="space-y-2 flex-grow max-w-md">
          <div class="flex justify-end items-center space-x-2">
            <span>Output: </span><input type="text" readonly placeholder="None" v-model="outputFilePath" class="input input-sm w-full border focus:outline-none" />
            <label class="btn btn-sm btn-ghost border border-base-content" @click="setOutputPath">browse</label>
          </div>  
        </div>
        <label class="btn btn-primary" @click="handleTranscribe()">
          transcribe
        </label>
      </div>
      <div v-else class="py-3">
        <div class="mb-2 text-base font-medium flex justify-between">
          <span>Transcribing...</span>
          <span>{{ Math.floor(progress) }}%</span>
        </div>
        <div class="w-full bg-base-100 rounded-full h-2.5">
          <div class="bg-primary h-2.5 rounded-full" :style="'width: ' + progress + '%; transition: width 0.3s ease-in-out;'"></div>
        </div>
      </div>
    </template>
        </mc-data-intake>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useAppStore } from '../stores/appStore';
import { FileData, SelectOption, Status, Toast } from '../types/Types';
import { fileAlreadyExists, removeExtension } from '../utils/HelperFunctions';
import McFileUpload from '../components/McFileUpload.vue';
import McFileGrid from '../components/McFileGrid.vue';
import McDataIntake from '../components/McDataIntake.vue';
import McBinaryModal from '../components/modals/McBinaryModal.vue';
import McMetaDataColumn from '../components/McMetaDataColumn.vue';

export default defineComponent({
  name: 'TranscriptGenerator',
  components: { McBinaryModal, McDataIntake, McFileUpload, McFileGrid, McMetaDataColumn },
  emits: ['toggle-toast'],
  setup() {
    const appStore = useAppStore();
    const aws = require('aws-sdk');
    const ipcRenderer = require('electron').ipcRenderer;
    const fs = require('fs');
    const path = require('path');

    return { appStore, aws, fs, ipcRenderer, path };
  },
  data() {
    return {
      binaryModalResolver: null as (() => void) | null,
      bitrate: '3000' as string,
      errorMessage: '' as string,
      files: ref<File[]>([]),
      fileObjects: [] as FileData[],
      filesLoading: true as boolean,
      transcribing: false as boolean,
      methodOptions: [
        { label: 'Transcribe locally', value: 'local' },
        { label: 'Transcribe and Upload to S3', value: 'upload' },
      ] as SelectOption[],
      outputFileExtension: '.vtt' as string,
      outputFilePath: 'None' as string,
      selectedMethod: {
        label: 'Transcribe locally',
        value: 'local',
      } as SelectOption,
      overwriteResponse: null as null | boolean,
      s3Region: '' as string,
      selectedFile: {
        bitrate: '' as string,
        duration: '' as string,
        file: null as null | File,
        thumbnailPath: '' as string,
        width: 0 as number,
        height: 0 as number,
      } as FileData,
      shortestDuration: null as null | number,
      showBinaryModal: false as boolean,
      showFileUpload: true as boolean,
      showToast: false as boolean,
      statuses: [] as Status[],
      toast: {} as Toast,
      toastMessage: '' as string,
      successToastMessage: '' as string,
    };
  },
  mounted() {
    this.setOutputPathFromStorage();
    this.setMethodFromStorage();
  },
  computed: {
    progress(): number {
      const denominator = this.selectedMethod.value === 'upload' ? 5 : 4; // local = 4 steps, upload = 5
      if (this.statuses.length === 0) return 0;
      const sum = this.statuses.reduce((acc: number, s: Status) => acc + s.value, 0);
      return (sum / this.statuses.length / denominator) * 100;
    },
  },
  methods: {
    setOutputPathFromStorage() {
      if (this.appStore.transOutputPath) {
        this.outputFilePath = this.appStore.transOutputPath;
      }
    },
    setMethodFromStorage() {
      if (this.appStore.transMethod) {
        this.selectedMethod =
          (this.appStore.transMethod === 'local' || this.appStore.transMethod === 'download')
            ? this.methodOptions[0]
            : this.methodOptions[1];
      }
    },
    handleBadExtension() {
      this.$emit('toggle-toast', {
        message: 'Only .mp4, .mov, and .m4v files are allowed',
        kind: 'alert-error',
        timeout: 3000,
      });
    },
    handleFilesUploaded(uploadedFiles: File[]) {
      process.nextTick(() => {
        this.files.push(...uploadedFiles);
        this.showFileUpload = false;
        this.selectedFile.file = this.files[0];
      });
    },
    handleFileSelected(file: any) {
      this.selectedFile = file;
    },
    async handleMethodSelect(method: SelectOption) {
      this.statuses = [];
      this.appStore.setTransMethod(method.value);

      if (method.value === 'upload') {
        const connection = await this.checkS3Connection();
        if (!connection) {
          this.selectedMethod = this.methodOptions[0];
        } else {
          this.selectedMethod = method;
        }
      } else {
        this.selectedMethod = method;
      }
    },
    handleOverwriteResponse(response: string): void {
      this.showBinaryModal = false;
      this.overwriteResponse = response === 'yes';
      if (this.binaryModalResolver) {
        this.binaryModalResolver();
      }
    },

    setSuccessToastMsg(numFiles: number) {
      this.successToastMessage =
        numFiles === 1
          ? numFiles + ' File Transcribed Successfully  🎉'
          : numFiles + ' Files Transcribed Successfully  🎉';
    },

    resetStatuses() {
      this.statuses = this.fileObjects.map(() => ({
        label: '',
        color: 'primary',
        value: 0,
      }));
    },

    handleFilesLoaded(fileObjects: FileData[]) {
      if (fileObjects) {
        this.filesLoading = false;
        this.fileObjects = fileObjects;
        this.resetStatuses();
        this.setSuccessToastMsg(fileObjects.length);
      }
    },

    async setOutputPath() {
      const result = await this.ipcRenderer.invoke('dialog');
      this.outputFilePath = result ?? this.outputFilePath;
      this.appStore.setTransOutputPath(this.outputFilePath);
    },

    errorsFlagged(): boolean {
      if (!/^\d+$/.test(this.bitrate)) {
        this.toastMessage = 'Please enter a valid bitrate';
        return true;
      }
      if (
        (this.outputFilePath === 'None' || !this.outputFilePath) &&
        this.selectedMethod.value === 'local'
      ) {
        this.toastMessage = 'Please enter a valid output path';
        return true;
      }
      return false;
    },

    fileAlreadyExists,
    removeExtension,

    async transcribeOneFile(fileObj: FileData, index: number): Promise<void> {
      const videoPath = (fileObj.file as File & { path?: string }).path;
      const filename = fileObj.file!.name;
      if (!videoPath) {
        this.statuses[index] = { label: 'Error', color: 'text-error', value: 4 };
        return;
      }

      try {
        this.statuses[index] = { label: 'Transcribing', color: 'text-warning', value: 2 };

        const { vtt: vttContent } = await this.ipcRenderer.invoke('transcribe-video', { videoPath });

        this.statuses[index] = {
          label: this.selectedMethod.value === 'upload' ? 'Uploading to S3' : 'Writing file',
          color: 'text-accent',
          value: 4,
        };

        if (this.selectedMethod.value === 'upload') {
          await this.uploadVttToS3(vttContent, index, this.removeExtension(filename) + '.vtt');
          this.statuses[index] = { label: 'Complete', color: 'text-success', value: 5 };
        } else {
          // local: write VTT to disk only, no S3
          const outPath = this.path.join(
            this.outputFilePath,
            this.removeExtension(filename) + '.vtt'
          );
          this.fs.writeFileSync(outPath, vttContent, 'utf-8');
          this.statuses[index] = { label: 'Complete', color: 'text-success', value: 4 };
        }
      } catch (err: any) {
        this.statuses[index] = { label: 'Error', color: 'text-error', value: 4 };
        throw err;
      }
    },

    async uploadVttToS3(vttContent: string, index: number, filename: string): Promise<void> {
      await this.updateS3Creds();
      const s3 = new this.aws.S3();
      const params = {
        Bucket: this.appStore.s3BucketName as string,
        Key: filename,
        Body: Buffer.from(vttContent, 'utf-8'),
        ContentType: 'text/vtt',
      };
      await s3.upload(params).promise();
    },

    async updateS3Creds() {
      this.aws.config.update({
        accessKeyId: this.appStore.s3AccessKey as string,
        secretAccessKey: this.appStore.s3SecretKey as string,
        apiVersion: 'latest',
      });
      const s3 = new this.aws.S3({ region: 'us-east-1' });
      try {
        const loc = await s3.getBucketLocation({ Bucket: this.appStore.s3BucketName as string }).promise();
        const region = loc.LocationConstraint || 'us-east-1';
        this.aws.config.update({ region });
      } catch {
        this.aws.config.update({ region: 'us-east-1' });
      }
    },

    async checkS3Connection(): Promise<boolean> {
      try {
        this.aws.config.update({
          accessKeyId: this.appStore.s3AccessKey,
          secretAccessKey: this.appStore.s3SecretKey,
        });
        const s3 = new this.aws.S3();
        await s3.headBucket({ Bucket: this.appStore.s3BucketName as string }).promise();
        return true;
      } catch {
        this.$emit('toggle-toast', {
          message: 'Incorrect AWS Settings',
          kind: 'alert-error',
          timeout: 3000,
        });
        this.transcribing = false;
        return false;
      }
    },

    handleTranscriptionComplete(error: string = '') {
      this.transcribing = false;

      if (error === '') {
        if (this.overwriteResponse || this.overwriteResponse === null) {
          this.toastMessage = this.successToastMessage;
        } else {
          this.toastMessage = 'Transcription aborted.';
        }
        this.toast = {
          message: this.overwriteResponse ? this.successToastMessage : this.toastMessage,
          kind: 'alert-success',
          timeout: 5000,
        };
        this.$emit('toggle-toast', this.toast);
        new window.Notification('Transcript Generation Complete', {
          body: this.successToastMessage,
        });
      } else {
        this.resetStatuses();
        this.toast = {
          message: 'Error: ' + error,
          kind: 'alert-error',
          timeout: 5000,
        };
        this.$emit('toggle-toast', this.toast);
      }
    },

    anyTranscriptionExists(): boolean {
      for (const file of this.fileObjects) {
        const newFile = this.removeExtension(file.file!.name) + this.outputFileExtension;
        const newFilePath = this.path.join(this.outputFilePath, newFile);
        if (fileAlreadyExists(newFilePath)) {
          return true;
        }
      }
      return false;
    },

    async handleTranscribe() {
      if (this.errorsFlagged()) {
        this.toast = {
          message: this.toastMessage,
          kind: 'alert-error',
          timeout: 3000,
        };
        this.$emit('toggle-toast', this.toast);
        return;
      }

      if (this.anyTranscriptionExists() && this.selectedMethod.value === 'local') {
        this.showBinaryModal = true;
        await new Promise<void>((resolve) => {
          (this as any).binaryModalResolver = resolve;
        });
      }

      if (!(this.overwriteResponse === false)) {
        this.transcribing = true;
        try {
          for (let i = 0; i < this.fileObjects.length; i++) {
            await this.transcribeOneFile(this.fileObjects[i], i);
          }
        } catch (err: any) {
          this.handleTranscriptionComplete(err?.message ?? String(err));
          return;
        }
        this.handleTranscriptionComplete();
      } else {
        this.handleTranscriptionComplete();
      }
    },
  },
});
</script>
<style scoped>
</style>
