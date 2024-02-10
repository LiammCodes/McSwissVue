<template>
  <Transition name="slide-fade" class="pt-6">
    <div v-if="showToast" class="toast toast-top toast-right">
      <div :class="['alert', 'max-w-sm', toast.kind, 'flex justify-between items-center toast-content']">
        <span>{{ toast.message }}</span>
        <button class="close-button" @click="$emit('close')">
          <XMarkIcon class="h-5 w-5"/>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';
import { Toast } from '../types/Types';

export default defineComponent({
  components: { XMarkIcon },
  name: 'Toast',
  props: {
    toast: {
      type: Object as PropType<Toast>,
      required: true,
    },
    // message: {
    //   type: String as PropType<string>,
    //   required: true,
    // },
    // kind: {
    //   type: String as PropType<string>,
    //   required: true,
    // },
    showToast: {
      type: Boolean as PropType<boolean>,
      required: true,
    },
    // timeout: {
    //   type: Number as PropType<number>,
    //   required: false,
    // },
    // toastData: {
    //   type: Object as PropType<Object>,
    //   required: true
    // }
  },
  methods: {
    closeToast() {
      this.$emit('close');
    },
  },
  watch: {
    showToast(newValue) {
      if (newValue && this.toast.timeout) {
        // Automatically close the toast after the specified timeout
        setTimeout(() => {
          this.closeToast();
        }, this.toast.timeout);
      }
    },
  },
});
</script>

<style scoped>
.slide-fade-enter-active, .slide-fade-leave-active {
  transition: transform 0.5s, opacity 0.5s;
}
.slide-fade-enter, .slide-fade-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
.toast {
  position: fixed;
  pointer-events: none;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
}
.toast-content {
  pointer-events: auto;
}
</style>
