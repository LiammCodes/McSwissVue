<template>
  <main-layout/>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import MainLayout from './layouts/MainLayout.vue';
import { useToast } from 'vue-toastification';
export default defineComponent({
  name: 'App',
  components: {
    MainLayout,
  },
  setup() {
    const toast = useToast();
    toast('BELLLLLOOOOO')
  }
});
</script>

<style scoped>
</style>
