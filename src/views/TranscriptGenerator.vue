<template>
  <mc-file-upload 
    v-if="showFileUpload" 
    action="transcribe" 
    @files-uploaded="handleFilesUploaded" 
    @bad-extension="handleBadExtension"
  />
  <div v-else class="m-2 h-full" style="overflow-x: hidden;">
    <mc-binary-modal :show-modal="showBinaryModal" @response="handleOverwriteResponse" />
    <div class="grid grid-cols-4 gap-2 h-full">
      <!-- file grid col -->
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
      <!-- metadata col -->
      <mc-meta-data-column class="col-span-1 gap-2 bg-base-200 rounded-xl" :files-loading="filesLoading" :selected-file="selectedFile" />
    </div>
  </div>

  <mc-data-intake v-if="!showFileUpload">
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
        <div v-if="selectedMethod.value === 'download'" class="space-y-2 flex-grow max-w-md">
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
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useAppStore } from '../stores/appStore';
import { FileData, SelectOption, Status, Toast } from '../types/Types';
import { 
  fileAlreadyExists,
  removeExtension
} from '../utils/HelperFunctions';
import McFileUpload from '../components/McFileUpload.vue';
import McFileGrid from '../components/McFileGrid.vue';
import McDataIntake from '../components/McDataIntake.vue';
import McBinaryModal from '../components/modals/McBinaryModal.vue';
import McTimeInput from '../components/McTimeInput.vue';
import McMetaDataColumn from '../components/McMetaDataColumn.vue';
import * as https from 'https';
import * as stream from 'stream';

export default defineComponent({
  name: 'TranscriptGenerator',
  components: { McBinaryModal, McDataIntake, McFileUpload, McFileGrid, McMetaDataColumn, McTimeInput },
  emits: ['toggle-toast'],
  setup() {
    const appStore = useAppStore();
    const aws = require('aws-sdk');
    const s3 = new aws.S3();
    const ipcRenderer = require('electron').ipcRenderer;
    const fs = require('fs');
    const path = require('path');
    const request = require('request');
    const spawn = require('child_process').spawn;
    

    return { appStore, aws, fs, ipcRenderer, path, request, s3, spawn }
  },
  data(){
    return {
      binaryModalResolver: null as (() => void) | null,
      bitrate: '3000' as string,
      errorMessage: '' as string,
      files: ref<File[]>([]),
      fileObjects: [] as FileData[],
      filesLoading: true as boolean,
      transcribing: false as boolean,
      methodOptions: [
        {
          label: "Transcribe and Download",
          value: "download"
        },
        {
          label: "Transcribe and Upload to S3",
          value: "upload"
        }
      ] as SelectOption[],
      outputFileExtension: '.vtt' as string,
      outputFilePath: 'None' as string,
      selectedMethod: {
        label: "Transcribe and Download",
        value: "download"
      } as SelectOption,
      overwriteResponse: null as null | boolean,
      s3Region: '' as string,
      selectedFile: {
        bitrate: '' as string,
        duration: '' as string,
        file: null as null | File,
        thumbnailPath: '' as string
      } as FileData,
      shortestDuration: null as null | number,
      showBinaryModal: false as boolean,
      showFileUpload: true as boolean,
      showToast: false as boolean,
      statuses: [] as Status[],
      toast: {} as Toast,
      toastMessage: '' as string,
      trintTestPass: true as boolean,
      successToastMessage: '' as string,
    }
  },
  watch: {
    progress(progress) {
      if (progress >= 100) {
        this.handleTranscriptionComplete();
      }
    }
  },
  mounted() {
    this.setOutputPathFromStorage();
    this.setMethodFromStorage();
  },
  computed: {
    progress(): number {
      let result = 0;
      let denominator = this.selectedMethod.value === "upload" ? 5 : 4;
      this.statuses.forEach((status: Status) => {
        result = result + status.value;
      })

      return ((result/this.statuses.length)/denominator) * 100;
    }
  },
  methods: {
    setOutputPathFromStorage() {
      if (this.appStore.transOutputPath) {
        this.outputFilePath = this.appStore.transOutputPath;
      }
    },
    setMethodFromStorage() {
      if (this.appStore.transMethod) {
        if (this.appStore.transMethod === "download") {
          this.selectedMethod = this.methodOptions[0];
        } else {
          this.selectedMethod = this.methodOptions[1];
        }
      }
    },
    handleBadExtension() {
      this.$emit('toggle-toast', {
        message: 'Only .mp4, .mov, and .m4v files are allowed',
        kind: 'alert-error',
        timeout: 3000
      })
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

      if (method.value === "upload") {
        await this.checkS3Connection().then((connection: boolean) => {
          if (!connection) {
            this.selectedMethod = { label: "Transcribe and Downlad", value: "download" };
          } else {
            this.selectedMethod = method;
          }
        })
      } else {
        this.selectedMethod = method;
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

    setSuccessToastMsg(numFiles: number) {
      if (numFiles === 1) {
        this.successToastMessage = numFiles + ' File Transcribed Successfully  🎉'
      } 
      else {
        this.successToastMessage = numFiles + ' Files Transcribed Successfully  🎉'
      }
    },

    resetStatuses() {
      this.statuses = this.fileObjects.map(_ => ({ 
        label: "", 
        color: "primary", 
        value: 0
      }));
    },

    handleFilesLoaded(fileObjects: FileData[]) {
      if (fileObjects) {
        this.filesLoading = false
        this.fileObjects = fileObjects;
        this.resetStatuses();
        this.setSuccessToastMsg(fileObjects.length)
      }
    },

    async setOutputPath() {
      await this.ipcRenderer.invoke('dialog').then((result: string) => {
        this.outputFilePath = result;
        this.appStore.setTransOutputPath(result);
      })
    },

    errorsFlagged(): boolean {
      if (!(/^\d+$/.test(this.bitrate))) {
        this.toastMessage = 'Please enter a valid bitrate';
        return true;
      } else if ((this.outputFilePath === 'None' || this.outputFilePath === null || !this.outputFilePath) && this.selectedMethod.value === 'download') {
        this.toastMessage = 'Please enter a valid output path';
        return true;
      } else {
        return false;
      }
    },

    fileAlreadyExists,
    removeExtension,

    async handleTranscribe() {
      if (!this.errorsFlagged()) {
        this.transcribing = true;
        await this.transcribe();
      } else {
        this.toast = {
          message: this.toastMessage,
          kind: 'alert-error',
          timeout: 3000
        }
        this.$emit('toggle-toast', this.toast)
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
        }
        this.$emit('toggle-toast', this.toast);
        new window.Notification('Transcript Generation Complete', { body: this.successToastMessage });
      } else {
        this.resetStatuses();
        this.toast = {
          message: "Error: " + error,
          kind: 'alert-error',
          timeout: 5000,
        }
        this.$emit('toggle-toast', this.toast);
      }

      
    },

    anyTranscriptionExists(): boolean {
      for (const file of this.fileObjects) {
        const newFile = removeExtension(file.file!.name) + this.outputFileExtension;
        const newFilePath = this.path.join(this.outputFilePath, newFile);
        if (fileAlreadyExists(newFilePath)) {
          return true;
        }
      }
      return false;
    },

    async downloadTranscript(url: string, index: number, filename: string) {
    
      const fileDownloadPath = this.path.join(this.outputFilePath, this.removeExtension(filename) + '.vtt');
      console.log("Downloading transcript to " + fileDownloadPath)
      return new Promise((resolve, reject) => {
        const curlProcess = this.spawn('curl', ['-o', fileDownloadPath, url]);
        curlProcess.on('exit', (code: any) => {
          if (code === 0) {
            this.statuses[index] = {
              label: "Complete",
              color: "text-success",
              value: 4
            };
            resolve;
          } else {
            reject(new Error(`curl process exited with code ${code}`));
          }
        });
        
        curlProcess.on('error', (err: any) => {
          reject(err);
        });
      })
    }, 

    checkTrintConnection() {
      const options = {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'api-key': this.appStore.trintApiKey
        }
      };

      fetch('https://api.trint.com/transcripts/?limit=1&skip=0', options)
        .then(response => response.json())
        .then(response => {
          if (response.error != null) {
            this.trintTestPass = false;
          } else {
            this.trintTestPass = true;
          }
        })
        .catch(err => {
          this.trintTestPass = false;
        }).finally(() => {
          if (!this.trintTestPass) {
            this.$emit('toggle-toast', {
              message: 'Incorrect Trint Settings',
              kind: 'alert-error',
              timeout: 3000
            });
            this.transcribing = false;
            this.statuses = [];
          }
        });
    },

    async updateS3Creds(){
      const data = await new Promise<any>((resolve, reject) => {
        this.s3.headBucket({
          Bucket: this.appStore.s3BucketName as string,
        }, (err: Error, data: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
      // Set the region and access keys
      this.aws.config.update({
        region: data.BucketRegion,
        accessKeyId: this.appStore.s3AccessKey as string,
        secretAccessKey: this.appStore.s3SecretKey as string,
        apiVersion: 'latest'
      });
    },

    async checkS3Connection(): Promise<boolean> {
      try {
        this.updateS3Creds();
        return true; // Connection successful
      } catch (error) {
        console.log(error);
        this.$emit('toggle-toast', {
          message: 'Incorrect AWS Settings',
          kind: 'alert-error',
          timeout: 3000
        });
        this.transcribing = false;
        return false; // Connection failed
      }
    },

    async uploadToS3(filePath: string, index: number) {
      this.statuses[index] = {
        label: "Uploading to S3 Bucket",
        color: "info",
        value: 4
      }

      // Create a new instance of the S3 class
      await this.updateS3Creds();
      const s3 = new this.aws.S3();
     
      // Set the parameters for file to upload
      const params = {
        Bucket: this.appStore.s3BucketName as string,
        Key: this.path.basename(filePath), // filename
        Body: this.fs.readFileSync(filePath),
        ContentType: "text/vtt" // not sure if this makes it wotk? (probs not)
      };

      // Upload the file to S3
      await s3.upload(params, (err: any, data: any) => {
        if (err) {
          console.log('Error uploading file:', err);
        } else {
          this.statuses[index] = {
            label: "Complete",
            color: "text-success",
            value: 5
          }
          console.log('File uploaded successfully. File location:', data.Location);
          
        }
      });
    },

    createReadStreamFromUrl(url: string): Promise<stream.Readable> {
      return new Promise((resolve, reject) => {
        https.get(url, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to fetch URL (${url}), status code: ${response.statusCode}`));
            return;
          }

          resolve(response);
        }).on('error', (error) => {
          reject(error);
        });
      });
    },

    async uploadToS3WithUrl(url: string, index: number, filename: string) {
      this.statuses[index] = {
        label: "Uploading to S3 Bucket",
        color: "text-info",
        value: 4
      };

      try {
        // Create a readable stream from URL
        const response = await this.createReadStreamFromUrl(url);

        // Create a new instance of the S3 class
        await this.updateS3Creds();
        const s3 = new this.aws.S3();

        // Set the parameters for file to upload
        const params = {
          Bucket: this.appStore.s3BucketName,
          Key: filename,
          Body: response,
          ContentType: "text/vtt"
        };

        // Upload the file to S3
        const data = await s3.upload(params).promise();

        this.statuses[index] = {
          label: "Complete",
          color: "text-success",
          value: 5
        };

        console.log('File uploaded successfully. File location:', data.Location);
      } catch (error: any) {
        console.log('Error uploading file:', error);
        this.handleTranscriptionComplete('Error uploading file: ' + error.message);
      }
    },


    async startStatusUpdates(trintId: string, index: number, filename: string) {
      // Periodically check the status of the file
      let checker = setInterval(async () => {
        const options = {
          method: 'GET',
          headers: {
            accept: 'application/json',
            'api-key': this.appStore.trintApiKey as string
          },
        };
        
        fetch(`https://api.trint.com/export/webvtt/${trintId}?captions-by-paragraph=false&max-subtitle-character-length=37&highlights-only=false&enable-speakers=false&speaker-on-new-line=false&speaker-uppercase=false&skip-strikethroughs=false`, options)
          .then(response => {
            // Check if the response status is in the range of 200-299 (success)
            if (response.ok) {
              return response.json(); // Parse the response body as JSON
            } else {
              // If response status is not in the success range, throw an error
              throw new Error(`${response.status}`);
            }
          })
          .then(async (response: any) => {
            console.log(response);
            this.statuses[index] = {
              label: "Downloading VTT File",
              color: "text-accent",
              value: 3
            };
            clearInterval(checker);
            if (this.selectedMethod.value === "upload") {
              await this.uploadToS3WithUrl(response.url, index, (this.removeExtension(filename) + '.vtt'))
            } else {
              await this.downloadTranscript(response.url, index, filename)
            }
          })
          .catch((err: any) => { // TODO: bad attempt at err handling for this.. 
            if (err === 'Error: 404') {
              console.error('404 Not Found error:', err);
              // Handle 404 error
            } else {
              // Handle other errors
              console.error('Fetch error:', err);
            }
            console.log(`PING:${trintId} - Incomplete`)
          });
      }, 30000); // Check status every 30 seconds
    },

    async uploadToTrint(fileObj: any, index: number) {
      const fileData = this.fs.readFileSync(fileObj.file.path);
      const options = {
        method: 'POST',
        url: `https://upload.trint.com/?filename=${(fileObj.file.name).replace(" ", "%20")}`,
        encoding: null,
        body: fileData,
        headers: {
          'api-key': this.appStore.trintApiKey,
          'content-type': 'video/mp4',
        }
      };

      this.statuses[index] = {
        label: "Uploading to Trint", 
        color: "text-primary", 
        value: 1 
      }
              
      await new Promise<void>((resolve, reject) => {
        this.request(options, (error: any, response: any, body: any) => {
          if (error) {
            reject(error);
            return;
          }
          const responseBody = response.body.toString();
          const responseObject = JSON.parse(responseBody);
          const trintId = responseObject.trintId;
          console.log(trintId)
          this.statuses[index] = {
            label: "Transcribing",
            color: "text-warning",
            value: 2
          };
          this.startStatusUpdates(trintId, index, fileObj.file.name);
          resolve(); // Resolve the Promise once the asynchronous operation is done
        });
      });
    },

    async transcribe() {
      this.checkTrintConnection();
      // check if any new files already exist
      if (this.anyTranscriptionExists() && this.selectedMethod.value === "download") {
        // Toggle the modal
        this.showBinaryModal = true;

        // Wait for the modal to close before triggering the action
        await new Promise((resolve) => {
          // @ts-ignore
          this.binaryModalResolver = resolve;
        });
      }

      if (this.overwriteResponse || this.overwriteResponse === null) {
        for (let i = 0; i < this.fileObjects.length; i++) {
          console.log("index: " + i)
          await this.uploadToTrint(this.fileObjects[i], i);
        }
      } else {
        this.handleTranscriptionComplete()
      }
    }
  }
});
</script>
<style scoped>
</style>