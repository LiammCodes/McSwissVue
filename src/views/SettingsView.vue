<template>
  <!-- About card -->
  <div class="bg-base-200 rounded-xl p-2 m-2">
    <information-circle-icon class="h-5 w-5 ml-1" />
    <span class=""> About </span>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import { InformationCircleIcon } from '@heroicons/vue/20/solid';

export default defineComponent({
  name: 'SettingsView',
  components: { InformationCircleIcon }
  
});

</script>