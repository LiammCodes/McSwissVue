<template>
  <div
    class="h-full w-full flex justify-center overflow-auto"
    :class="embedded ? 'items-center' : 'items-start mt-20'"
    @dragover.prevent="handleDragOver"
    @drop.prevent="handleDrop"
  >
    <label
      class="flex flex-col justify-center items-center px-4 transition bg-base-100 border-2 border-base-content border-dashed rounded-box appearance-none cursor-pointer hover:border-primary focus:outline-none shrink-0"
      :class="embedded ? 'w-3/4 min-h-[200px]' : 'w-3/4 min-h-[280px]'"
    >
      <span class="flex flex-col items-center space-y-2 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-10 h-10 text-base-content/60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <span class="font-medium">Drop files to {{ action }}</span>
        <span v-if="hint" class="text-sm text-base-content/70">{{ hint }}</span>
        <span class="text-primary underline">or browse</span>
      </span>
      <input
        type="file"
        name="file_upload"
        class="hidden"
        @change="handleFileUpload"
        :multiple="multipleFiles"
        :accept="accept"
      />
    </label>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'McFileUpload',
  emits: ['files-uploaded', 'bad-extension'],
  props: {
    action: {
      type: String,
      default: '',
    },
    hint: {
      type: String,
      default: '',
    },
    accept: {
      type: String,
      default: '.mp4, .mov, .m4v',
    },
    multipleFiles: {
      type: Boolean,
      required: false,
      default: true,
    },
    embedded: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    acceptedExtensions(): string[] {
      return (this.accept || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s && s.startsWith('.'));
    },
  },
  methods: {
    handleDragOver(event: DragEvent) {
      event.preventDefault();
    },
    fileHasAcceptedExtension(file: File): boolean {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const withDot = ext ? '.' + ext : '';
      return this.acceptedExtensions.length > 0 && this.acceptedExtensions.includes(withDot);
    },
    validateAndEmitFiles(files: File[]) {
      const bad = files.some((f) => !this.fileHasAcceptedExtension(f));
      if (bad) {
        this.$emit('bad-extension');
      } else {
        this.$emit('files-uploaded', files);
      }
    },
    handleDrop(event: DragEvent) {
      event.preventDefault();
      const raw = event.dataTransfer?.files;
      const files = this.multipleFiles
        ? Array.from(raw || [])
        : raw && raw.length ? [raw[0]] : [];
      this.validateAndEmitFiles(files);
    },
    handleFileUpload(event: Event) {
      const input = event.target as HTMLInputElement;
      if (input.files) {
        const files = Array.from(input.files);
        this.validateAndEmitFiles(files);
      }
      input.value = '';
    },
  },
})
</script>
