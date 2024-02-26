<template>
  <div id="themed-app" :data-theme="appStore.theme">
    <mc-toast 
      :showToast="showToast" 
      @close="showToast = false"
      :toast="toast"
    />
    <mc-drawer>
      <template v-slot:tool-view>
        <router-view @toggle-toast="toggleToast"/>
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
    return { appStore };
  },
  data() {
    return {
      showToast: false as boolean,
      toast: {} as Toast
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