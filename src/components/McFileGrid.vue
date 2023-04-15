<template>
  <div class="grid grid-cols-6 gap-4">
    <div
      class="flex flex-col items-center p-4 bg-base-300 rounded-lg"
      v-for="file in files"
      :key="file.name"
    >
      <img :src="file.preview" class="file-thumbnail h-10 w-full object-cover mb-4" />
      <div class="file-name text-center mb-4">{{ file.name }}</div>
      <div class="file-actions space-x-2">
        <button
          @click="removeFile(file)"
          class="py-1 px-3 bg-error text-white rounded hover:bg-red-600"
        >
          Remove
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    files: {
      type: Array,
      required: true,
    },
  },
  mounted() {
    console.log(this.files);
  },
  methods: {
    removeFile(file) {
      this.$emit('remove-file', file);
    },
    openFile(file) {
      this.$emit('open-file', file);
    },
  },
};
</script>

<style scoped>
  .file-thumbnail {
    border-radius: 0.5rem;
  }
</style>
