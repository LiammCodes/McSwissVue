<template>
  <div id="themed-app" :data-theme="appStore.theme">
    <mc-drawer>
      <template v-slot:tool-view>
        <router-view/>
      </template>
    </mc-drawer>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useAppStore } from '../stores/appStore';
import McDrawer from '../components/McDrawer.vue';
export default defineComponent({
  name: 'MainLayout',
  components: {
    McDrawer,
  },
  setup() {
    const appStore = useAppStore();
    return { appStore };
  },
  mounted() {
    this.$router.push({name: this.appStore.selectedTool})
    console.log(this.appStore.theme);
  }
});
</script>