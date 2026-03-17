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
import { useTabsStore } from '../stores/tabsStore';
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
    const tabsStore = useTabsStore();
    return { appStore, tabsStore };
  },
  data() {
    return {
      showToast: false as boolean,
      toast: {} as Toast
    }
  },
  mounted() {
    this.tabsStore.ensureAtLeastOneTab(this.appStore.selectedView);
    if (this.$route.name !== 'Settings') {
      this.$router.replace({ name: 'Workspace' });
    }
    this.setupUpdateListeners();
  },
  beforeUnmount() {
    const { ipcRenderer } = require('electron');
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.removeAllListeners('update-not-available');
    ipcRenderer.removeAllListeners('update-downloading');
    ipcRenderer.removeAllListeners('update-downloaded');
    ipcRenderer.removeAllListeners('update-error');
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
          message: `Update available: v${info.version}. Go to Settings to install.`,
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
      ipcRenderer.on('update-downloading', (_event: Event, progress: { percent: number; transferred: number; total: number; bytesPerSecond: number }) => {
        this.appStore.setUpdateStatus('downloading');
        this.appStore.setDownloadProgress(progress);
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