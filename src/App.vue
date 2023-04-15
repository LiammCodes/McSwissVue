<script lang="ts">
import { defineComponent } from 'vue';
import MainLayout from './layouts/MainLayout.vue';
export default defineComponent({
  name: 'App',
  components: {
    MainLayout,
  },
});
</script>

<template>
  <main-layout/>
</template>

<style scoped>
</style>
