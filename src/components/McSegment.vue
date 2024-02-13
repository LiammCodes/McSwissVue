<template>
  <div class="flex justify-center bg-base-200 rounded-xl p-4">
    <div class="space-y-2 w-full">
      <div class="font-bold flex pb-2 justify-between">
        <span class="text-base font-bold" style="word-break: break-all;">{{ segment.name }}</span>
        <button class="btn hover:btn-error btn-xs">
          <x-mark-icon class="w-4 h-4"/>
        </button>
      </div>
      <div class="flex justify-center items-center">
        <mc-time-input
          v-model="segment.startTime"
          label="Start timestamp"
        />
      </div>
      <div class="flex justify-center items-center">
        <mc-time-input
          v-model="segment.endTime"
          label="End timestamp"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { XMarkIcon } from '@heroicons/vue/24/outline';
import { Segment } from '../types/Types';
import McTimeInput from "./McTimeInput.vue";

export default defineComponent({
  name: "McSegment",
  components: {
    XMarkIcon,
    McTimeInput
  },
  props: {
    modelValue: Object as PropType<Segment>,
  },
  data() {
    return {
      segment: this.modelValue as Segment,
    }
  },
  mounted() {},
  methods: {
    handleInput() {
      this.$emit('update:segment', this.segment)
    }
  },
});
</script>
