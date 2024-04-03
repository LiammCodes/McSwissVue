<template>
  <div class="m-2">
    <div class="grid grid-cols-5 gap-2 mt-3">
      <!-- About card -->
      <div class="col-span-2 row-span-2 bg-base-200 rounded-xl p-4 flex justify-center">
        <div>
          <div class="flex items-center justify-center mb-2 mt-1">
            <cloud-icon class="h-5 w-5 mr-2" />
            <span class="text-lg font-semibold">McSwiss</span>
            <div class="badge badge-outline badge-accent gap-2 mx-2">
              v{{ pjson.version }}
            </div>
          </div>

          <div class="flex space-x-3 justify-center">
            <div class="flex-col space-y-1 text-right">
              <div>Name:</div>
              <div>Author:</div>
              <div>Date:</div>
              <div>OS:</div>
            </div>
            <div class="flex-col justify-end space-y-1">
              <div>McIntyre Swiss Army Knife</div>
              <div>
                <a class="cursor-pointer underline text-primary" @click="goToWebsite" target="_blank">{{ pjson.author }}</a>
              </div>
              <div>2024-03-08 (3 wks ago)</div>
              <div>{{ os.type }} {{ os.machine }}</div>
            </div>
          </div>
        </div>      
      </div>

      <!-- AWS Settings card -->
      <div class="col-span-3 bg-base-200 rounded-xl p-4">
        <div class="flex items-center mb-2">
          <server-stack-icon class="h-5 w-5 mr-2" />
          <span class="text-lg font-semibold">AWS Settings</span>
        </div>
        <div class="flex items-center space-x-6 ml-0">
          <div class="flex-col w-44 text-right space-y-3">
            <div>S3 Access Key ID:</div>
            <div>S3 Secret Access Key:</div>
          </div>
          <div class="flex-col grow justify-end space-y-3">
            <input
              type="password"
              v-model="s3Access"
              class="input input-sm w-full focus:outline-none"
            />
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
          <span class="text-lg font-semibold">Trint Settings</span>
        </div>
        <div class="flex items-center space-x-6 ml-0">
          <div class="flex-col w-44 text-right space-y-3">
            <div>Trint API Key:</div>
          </div>
          <div class="flex-col grow justify-end space-y-3">
            <input
              type="password"
              v-model="trintApiKey"
              class="input input-sm w-full focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import { CloudIcon, ServerStackIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/vue/24/outline';

export default defineComponent({
  name: 'SettingsView',
  components: { CloudIcon, ServerStackIcon, ChatBubbleBottomCenterTextIcon },
  setup() {
    let pjson = require('./package.json');
    let os = require('os');
    return { pjson, os }
  },
  data() {
    return {
      s3Access: '' as string,
      s3Secret: '' as string,
      trintApiKey: '' as string,
    }
  },
  methods: {
    goToWebsite() {
      // @ts-ignore
      require('electron').shell.openExternal("https://liamcodes.com/");
    }, 
  }
});

</script>