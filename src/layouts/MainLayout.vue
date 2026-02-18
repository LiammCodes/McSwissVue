<template>
  <!-- for custom title bar -> :class="isMac ? 'macHeight' : 'winHeight'"-->
  <div id="themed-app" class="h-screen flex flex-col" :data-theme="appStore.theme">
    <mc-toast 
      :showToast="showToast" 
      @close="showToast = false"
      :toast="toast"
    />
    <mc-navbar class="flex flex-col h-full overflow-hidden">
      <template v-slot:tool-view>
        <router-view @toggle-toast="toggleToast" class="flex-1 min-h-0 flex flex-col overflow-hidden"/>
      </template>
    </mc-navbar>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useAppStore } from '../stores/appStore';
import { Toast } from '../types/Types';
import McToast from '../components/McToast.vue';
import McNavbar from '../components/McNavbar.vue';

export default defineComponent({
  name: 'MainLayout',
  components: {
    McNavbar,
    McToast
  },
  setup() {
    const appStore = useAppStore();
    return { appStore };
  },
  data() {
    return {
      showToast: false as boolean,
      toast: {} as Toast
    }
  },
  // computed: {
  //   isMac() {
  //     let osType = this.os.type + "" as string;
  //     return osType.toLowerCase() == "darwin";
  //   }
  // },
  mounted() {
    this.$router.push({ name: this.appStore.selectedView });
    this.setupUpdateListeners();
  },
  methods: {
    toggleToast(newToast: Toast): void {
      this.toast = newToast;
      this.showToast = true;
    },
    setupUpdateListeners() {
      const { ipcRenderer } = require('electron');
      ipcRenderer.on('update-available', (_event: Event, info: { version: string }) => {
        this.appStore.setUpdateAvailable(true, { version: info.version });
        this.toggleToast({
          message: `Update available: v${info.version}. It will install when you quit the app.`,
          kind: 'alert-info',
          timeout: 6000
        });
      });
      ipcRenderer.on('update-not-available', () => {
        const wasUserCheck = this.appStore.updateStatus === 'checking';
        this.appStore.setUpdateStatus('idle');
        if (wasUserCheck) {
          this.toggleToast({ message: 'You’re on the latest version.', kind: 'alert-success', timeout: 3000 });
        }
      });
      ipcRenderer.on('update-downloading', () => {
        this.appStore.setUpdateStatus('downloading');
      });
      ipcRenderer.on('update-downloaded', (_event: Event, info: { version: string }) => {
        this.appStore.setUpdateDownloaded(info.version);
        this.toggleToast({
          message: `Update v${info.version} downloaded. Restart the app to install.`,
          kind: 'alert-success',
          timeout: 8000
        });
      });
      ipcRenderer.on('update-error', (_event: Event, data: { message: string }) => {
        this.appStore.setUpdateStatus('error', data.message);
      });
    }
  }
});
</script>
<style scoped>
/* .winHeight {
  height: calc(100vh - 30px)
}

.macHeight {
  height: calc(100vh - 28px)
} */

</style>