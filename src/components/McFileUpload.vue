<template>
 <div class="h-full w-full flex items-start justify-center mt-20">
    <label class="flex justify-center items-center w-3/4 h-1/2 px-4 transition bg-base-100 border-2 border-text border-dashed rounded-md appearance-none cursor-pointer hover:border-primary focus:outline-none">
      <span class="flex items-center space-x-2">
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            class="w-6 h-6" 
            fill="none" 
            viewBox="0 0 24 24"
            stroke="currentColor" 
            stroke-width="2">
          <path 
              stroke-linecap="round" 
              stroke-linejoin="round"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
          />
        </svg>
        <span class="font-medium">
          Drop files to {{ action }} or
          <span class="text-primary underline"> browse</span>
        </span>
      </span>
      <input type="file" name="file_upload" class="hidden" @change="handleFileUpload" multiple>
    </label>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'McFileUpload',
  emits: ["files-uploaded"],
  props: {
    action: String
  },
  setup() {
    
  },
  methods: {
    handleFileUpload(event: Event) {
      const input = event.target as HTMLInputElement;
      if (input.files) {
        const files = Array.from(input.files);
        this.$emit("files-uploaded", files);
      }
    },
  }
})
</script>
