<template>
  <div class="flex justify-end items-center space-x-2">
    <span>{{ label }}: </span>
    <input
      type="text"
      v-mask="'##:##:##'"
      v-model="time"
      @input="handleInput"
      class="input input-sm w-24 focus:outline-none"
    />
  </div> 
</template>

<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({
  name: 'TimeInput',
  props: {
    label: String,
    value: String,
  },
  data() {
    return {
      time: "00:00:00"
    }
  },
  methods: {
    handleInput() {
      this.$emit('update:modelValue', this.time)
    }
  }
});
</script>