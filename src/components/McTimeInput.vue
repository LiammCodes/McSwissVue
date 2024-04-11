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
  watch: {
    time(newVal: string, oldVal: string) {
      const str = newVal;
      if (str.length < 8) {
        this.time = '0' + this.time;
      } else if (str.length > 8 && str[0] === '0') {
        this.time = str.slice(1);
      }
    }
  },
  methods: {
    handleInput() {
      this.$emit('update:modelValue', this.time)
    }
  }
});
</script>


