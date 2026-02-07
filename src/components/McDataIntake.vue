<template>
  <div class="bg-base-200 rounded-xl mt-2 py-2 px-4 bottom-0">
    <slot name="data-intake"/>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'McDataIntake'
});
</script>