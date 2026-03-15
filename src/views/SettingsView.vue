<template>
  <div class="h-full">
    <div class="grid grid-cols-5 gap-2 mt-3">
      <!-- About card -->
      <div class="col-span-2 row-span-2 bg-base-200 rounded-xl p-4 flex justify-center">
        <div>
          <div class="flex items-center justify-center mb-2">
            <cloud-icon class="h-5 w-5 mr-2" />
            <span class="text-lg font-semibold">McSwiss</span>
            <div class="badge text-green-900 badge-success gap-2 mx-2">
              v{{ appVersion }}
            </div>
          </div>

          <div class="flex flex-col items-center gap-2 mb-3 w-full max-w-xs">
            <div class="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                class="btn btn-sm btn-outline btn-primary"
                :disabled="appStore.updateStatus === 'checking' || appStore.updateStatus === 'downloading'"
                @click="checkForUpdates"
              >
                <span v-if="appStore.updateStatus === 'checking'" class="loading loading-spinner loading-sm" />
                {{ appStore.updateStatus === 'checking' ? 'Checking…' : 'Check for updates' }}
              </button>
              <button
                v-if="appStore.updateStatus === 'available'"
                type="button"
                class="btn btn-sm btn-primary"
                @click="downloadUpdate"
              >
                Update now
              </button>
              <button
                v-if="appStore.updateStatus === 'downloaded'"
                type="button"
                class="btn btn-sm btn-primary"
                @click="restartToInstall"
              >
                Install and restart
              </button>
            </div>
            <p v-if="appStore.updateStatus === 'available'" class="text-sm text-primary">
              Update available: v{{ appStore.updateInfo?.version }}
            </p>
            <div v-if="appStore.updateStatus === 'downloading'" class="w-full space-y-1">
              <p class="text-sm text-primary">Downloading update…</p>
              <progress
                class="progress progress-primary w-full"
                :value="appStore.downloadProgress?.percent ?? 0"
                max="100"
              />
              <p v-if="appStore.downloadProgress" class="text-xs text-base-content/70">
                {{ Math.round(appStore.downloadProgress.percent) }}%
                <template v-if="appStore.downloadProgress.bytesPerSecond">
                  · {{ formatSpeed(appStore.downloadProgress.bytesPerSecond) }}
                </template>
              </p>
            </div>
            <p v-if="appStore.updateStatus === 'downloaded'" class="text-sm text-success">
              Ready to install v{{ appStore.updateInfo?.version }}
            </p>
            <p v-if="appStore.updateStatus === 'error'" class="text-sm text-error">
              {{ appStore.updateError || 'Update check failed' }}
            </p>
          </div>

          <div class="flex space-x-3 justify-center bg-base-100 py-5 px-10 rounded-lg">
            <div class="flex-col text-right">
              <div>Name:</div>
              <div>Author:</div>
              <div>Date:</div>
              <div>OS:</div>
            </div>
            <div class="flex-col justify-end">
              <div>McIntyre Swiss Army Knife</div>
              <div>
                <a class="cursor-pointer underline text-primary" @click="goToWebsite" target="_blank">Liam Codes</a>
              </div>
              <div>{{ appVersionRelease }}</div>
              <div>{{ os.type }} {{ os.machine }}</div>
            </div>
          </div>
        </div>      
      </div>


      <!-- AWS Settings card -->
      <div class="col-span-3 bg-base-200 rounded-xl p-4">
        <div class="flex items-center mb-2">
          <server-stack-icon class="h-5 w-5 mr-2" />
          <span class="text-lg font-semibold flex-grow">AWS Settings</span>
          <span v-if="awsTestLoading" class="loading loading-spinner text-primary mr-2"></span>
          <div v-else>
            <check-circle-icon v-if="awsTestPass && awsTestPass !== null" class="h-6 w-6 mr-2 text-success"/>
            <x-circle-icon v-if="!awsTestPass && awsTestPass !== null" class="h-6 w-6 mr-2 text-error"/>
          </div>
          <label class="btn btn-sm btn-outline" @click="testAwsConnection()">
            test
          </label>
        </div>
        <div class="space-y-2 max-w-2xl">
          <div class="flex space-x-6">
            <div class="flex-col w-60 text-right">
              S3 Transcript Bucket:
            </div>
            <input
              type="text"
              v-model="s3Bucket"
              class="input input-sm w-full focus:outline-none"
            />
          </div>
          <div class="flex space-x-6">
            <div class="flex-col w-60 text-right">
              S3 Access Key ID:
            </div>
            <input
              type="password"
              v-model="s3Access"
              class="input input-sm w-full focus:outline-none"
            />
          </div>
          <div class="flex space-x-6">
            <div class="flex-col w-60 text-right">
              S3 Secret Access Key:
            </div>
            <input
              type="password"
              v-model="s3Secret"
              class="input input-sm w-full focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  </div>

  <mc-data-intake>
    <template v-slot:data-intake>
      <div class="flex justify-end items-center gap-2">
        <label class="btn btn-outline btn-primary" @click="handleRevert()">
          revert changes
        </label>
        <label class="btn btn-primary" @click="handleSave()">
          save changes
        </label>
      </div>
    </template>
  </mc-data-intake>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import McDataIntake from '../components/McDataIntake.vue';
import { useAppStore } from '../stores/appStore';
import { CloudIcon, ServerStackIcon } from '@heroicons/vue/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/vue/20/solid';

export default defineComponent({
  name: 'SettingsView',
  components: { CheckCircleIcon, CloudIcon, McDataIntake, ServerStackIcon, XCircleIcon },
  emits: ['toggle-toast'],
  setup() {
    const appStore = useAppStore();
    const electron = require('electron');
    const ipcRenderer = require('electron').ipcRenderer;
    const os = require('os');
    return { appStore, electron, ipcRenderer, os }
  },
  data() {
    return {
      appVersion: '0.0.1' as string,
      appVersionRelease: '0000-00-00' as string,
      s3Bucket: '' as string,
      s3Access: '' as string,
      s3Secret: '' as string,
      awsTestPass: null as null | boolean,
      awsTestLoading: false as boolean,
    }
  },
  async mounted() {
    await this.setVersion();
    await this.setVersionRelease();
    this.setKeysFromStorage();
  },
  methods: {
    async setVersion() {
      await this.ipcRenderer.invoke('get-version').then((result: string) => {
        this.appVersion = result;
      })
    },
    async setVersionRelease() {
      await this.ipcRenderer.invoke('get-version-release').then((result: string) => {
        this.appVersionRelease = result;
      })
    },
    setKeysFromStorage() {
      this.s3Bucket = this.appStore.s3BucketName;
      this.s3Access = this.appStore.s3AccessKey;
      this.s3Secret = this.appStore.s3SecretKey;
    },

    goToWebsite() {
      // @ts-ignore
      this.electron.shell.openExternal("https://liamcodes.com/");
    },

    async testAwsConnection() {
      this.awsTestLoading = true;

      const { S3Client, HeadBucketCommand } = await import('@aws-sdk/client-s3');
      const client = new S3Client({
        region: 'us-east-1',
        credentials: {
          accessKeyId: this.s3Access as string,
          secretAccessKey: this.s3Secret as string,
        },
      });

      try {
        await client.send(new HeadBucketCommand({ Bucket: this.s3Bucket }));
        this.awsTestPass = true;
      } catch (err) {
        this.awsTestPass = false;
      }

      this.awsTestLoading = false;
    },

    handleSave() {
      this.appStore.setS3Data(this.s3Bucket, this.s3Access, this.s3Secret);
      this.$emit('toggle-toast', {
        message: 'Settings Saved 💾',
        kind: 'alert-success',
        timeout: 3000
      })
    },

    handleRevert() {
      this.setKeysFromStorage();
    },

    async checkForUpdates() {
      this.appStore.setUpdateStatus('checking');
      await this.ipcRenderer.invoke('check-for-updates');
    },

    async downloadUpdate() {
      this.appStore.setUpdateStatus('downloading');
      this.appStore.setDownloadProgress({ percent: 0, transferred: 0, total: 0, bytesPerSecond: 0 });
      const result = await this.ipcRenderer.invoke('download-update');
      if (!result?.ok) {
        this.appStore.setUpdateStatus('error', result?.error ?? 'Download failed');
      }
    },

    formatSpeed(bytesPerSecond: number): string {
      if (bytesPerSecond >= 1024 * 1024) return `${(bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`;
      if (bytesPerSecond >= 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
      return `${Math.round(bytesPerSecond)} B/s`;
    },

    restartToInstall() {
      this.ipcRenderer.invoke('quit-and-install');
    }
  }
});

</script>