<template>
  <div class="bg-base-200 rounded-xl p-3 bottom-0 mx-2">
    <slot name="data-intake"/>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'McDataIntake'
});
</script>