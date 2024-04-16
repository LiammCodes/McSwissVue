<template>
  <div class="m-2 h-full">
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

      <!-- Trint Settings card -->
      <div class="col-span-3 bg-base-200 rounded-xl p-4">
        <div class="flex items-center mb-2">
          <chat-bubble-bottom-center-text-icon class="h-5 w-5 mr-2" />
          <span class="text-lg font-semibold flex-grow">Trint Settings</span>
          <span v-if="trintTestLoading" class="loading loading-spinner text-primary mr-2"></span>
          <div v-else>
            <check-circle-icon v-if="trintTestPass && trintTestPass !== null" class="h-6 w-6 mr-2 text-success"/>
            <x-circle-icon v-if="!trintTestPass && trintTestPass !== null" class="h-6 w-6 mr-2 text-error"/>
          </div>
          <label class="btn btn-sm btn-outline" @click="testTrintConnection()">
            test
          </label>
        </div>
        <div class="flex space-x-6 max-w-2xl">
          <div class="flex-col w-60 text-right">
            Trint API Key:
          </div>
          <input
            type="password"
            v-model="trintApiKey"
            class="input input-sm w-full focus:outline-none"
          />
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
import { ChatBubbleBottomCenterTextIcon, CloudIcon, ServerStackIcon } from '@heroicons/vue/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/vue/20/solid';

export default defineComponent({
  name: 'SettingsView',
  components: { ChatBubbleBottomCenterTextIcon, CheckCircleIcon, CloudIcon, McDataIntake, ServerStackIcon, XCircleIcon },
  emits: ['toggle-toast'],
  setup() {
    const appStore = useAppStore();
    const aws = require('aws-sdk');
    const electron = require('electron');
    const ipcRenderer = require('electron').ipcRenderer;
    const os = require('os');
    return { appStore, aws, electron, ipcRenderer, os }
  },
  data() {
    return {
      appVersion: '0.0.1' as string,
      appVersionRelease: '0000-00-00' as string,
      s3Bucket: '' as string,
      s3Access: '' as string,
      s3Secret: '' as string,
      trintApiKey: '' as string,
      awsTestPass: null as null | boolean,
      awsTestLoading: false as boolean,
      trintTestPass: null as null | boolean,
      trintTestLoading: false as boolean,
    }
  },
  async mounted() {
    await this.setVersion();
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
      this.trintApiKey = this.appStore.trintApiKey;
    },

    goToWebsite() {
      // @ts-ignore
      this.electron.shell.openExternal("https://liamcodes.com/");
    },

    async testAwsConnection() {
      this.awsTestLoading = true;
      this.aws.config.update({
        accessKeyId: this.s3Access as string,
        secretAccessKey: this.s3Secret as string
      });

      const s3 = new this.aws.S3();

      try {
        await s3.headBucket({ Bucket: this.s3Bucket }).promise();
        this.awsTestPass = true;
      } catch (err) {
        this.awsTestPass = false;
      }

      this.awsTestLoading = false;
    },

    testTrintConnection() {
      this.trintTestLoading = true;
      const options = {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'api-key': this.trintApiKey
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
          this.trintTestLoading = false;
        });
    },

    handleSave() {
      this.appStore.setS3Data(this.s3Bucket, this.s3Access, this.s3Secret);
      this.appStore.setTrintKey(this.trintApiKey);
      this.$emit('toggle-toast', {
        message: 'Settings Saved 💾',
        kind: 'alert-success',
        timeout: 3000
      })
    },

    handleRevert() {
      this.setKeysFromStorage();
    }
  }
});

</script>