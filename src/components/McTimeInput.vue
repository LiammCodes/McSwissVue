<template>
  <div class="flex items-center w-full justify-between space-x-2">
    <div class="text-right">
      <span>{{ label }}:</span>
    </div>
    <input
      type="text"
      v-mask="'##:##:##'"
      v-model="time"
      @input="handleInput"
      class="input input-sm focus:outline-none w-24 text-center"
    />
  </div> 
</template>

<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({
  name: 'TimeInput',
  props: {
    label: String,
    modelValue: String,
  },
  data() {
    return {
      time: this.modelValue as string,
    }
  },
  methods: {
    handleInput() {
      this.$emit('update:modelValue', this.time)
    }
  }
});
</script>