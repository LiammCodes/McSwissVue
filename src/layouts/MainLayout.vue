<template>
  <div id="themed-app" :data-theme="appStore.theme">
    <mc-drawer>
      <!-- <toast 
        :message="errorMessage" 
        kind="alert-error" 
        :showToast="showToast" 
        @close="showToast = false" 
        :timeout="3000" 
      /> -->
      <template v-slot:tool-view>
        <router-view/>
      </template>
    </mc-drawer>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useAppStore } from '../stores/appStore';
import Toast from '../components/Toast.vue';
import McDrawer from '../components/McDrawer.vue';
export default defineComponent({
  name: 'MainLayout',
  components: {
    McDrawer,
    Toast
  },
  setup() {
    const appStore = useAppStore();
    return { appStore };
  },
  // data() {
  //   return {
  //     showToast: false as boolean,
  //     error
  //   }
  // },
  mounted() {
    this.$router.push({name: this.appStore.selectedTool})
    console.log(this.appStore.theme);
  }
});
</script>