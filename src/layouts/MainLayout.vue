<template>
  <div id="themed-app" :class="isMac ? 'macHeight' : 'winHeight'" :data-theme="appStore.theme">
    <mc-toast 
      :showToast="showToast" 
      @close="showToast = false"
      :toast="toast"
    />
    <mc-drawer class="overflow-hidden">
      <template v-slot:tool-view>
        <router-view @toggle-toast="toggleToast" class="overflow-hidden"/>
      </template>
    </mc-drawer>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useAppStore } from '../stores/appStore';
import { Toast } from '../types/Types';
import McToast from '../components/McToast.vue';
import McDrawer from '../components/McDrawer.vue';
export default defineComponent({
  name: 'MainLayout',
  components: {
    McDrawer,
    McToast
  },
  setup() {
    const appStore = useAppStore();
    const os = require('os');
    return { appStore, os };
  },
  data() {
    return {
      showToast: false as boolean,
      toast: {} as Toast
    }
  },
  computed: {
    isMac() {
      let osType = this.os.type + "" as string;
      return osType.toLowerCase() == "darwin";
    }
  },
  mounted() {
    this.$router.push({name: this.appStore.selectedView})
    console.log(this.appStore.theme);
  },
  methods: {
    toggleToast(newToast: Toast): void {
      this.toast = newToast;
      this.showToast = true;
    }
  }
});
</script>
<style scoped>
.winHeight {
  height: calc(100vh - 30px)
}

.macHeight {
  height: calc(100vh - 28px)
}

</style>