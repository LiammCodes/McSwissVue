<template>
  <div class="col-span-3 flex flex-wrap gap-2 justify-start bg-base-200 rounded-xl p-2">
    This is a segment!
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { DocumentIcon } from '@heroicons/vue/24/outline';

export default defineComponent({
  name: "McSegment",
  components: {
    DocumentIcon
  },
  mounted() {},
  methods: {},
});
</script>

<style scoped>
</style>