<template>
  <dialog ref="binaryModal" class="modal" :class="{ 'modal-open': showModal }">
    <div class="modal-box modal-bg">
      <h3 class="font-bold text-lg">This file already exists...</h3>
      <p class="py-4">
        One or more of the previews being created already exists in this location. 
        Would you like to overwrite it?
      </p>
      <div class="modal-action flex items-center justify-center">
        <button tabindex="0" ref="noBtn" class="btn flex-grow focus:outline-none btn-primary" @click="handleModalClose('no')">No</button>
        <button class="btn flex-grow" @click="handleModalClose('yes')">yes</button>
      </div>
    </div>
  </dialog>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'McBinaryModal',
  props: {
    showModal: Boolean,
  },
  emits: ['response'],
  watch: {
    showModal(newVal, oldVal) {
      if (newVal && !oldVal) {
        let noButton = this.$refs.noBtn as HTMLElement;
        noButton.focus();
      }
    }
  },
  mounted() {
    
  },
  methods: {
    handleModalClose(answer: string): void {
      if (answer === 'yes') {
        this.$emit('response', 'yes');
      } else {
        this.$emit('response', 'no');
      }
    }
  }
});
</script>