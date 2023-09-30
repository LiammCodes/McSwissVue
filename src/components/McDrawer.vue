<template>
  <div class="drawer h-screen">
    <input id="my-drawer" type="checkbox" v-model="drawerOpen" class="d-toggle" /> 
    <div class="drawer-content flex flex-col p-2">
      <!-- Navbar -->
      <div class="navbar bg-primary rounded-box text-primary-content">
        <div class="flex-none">
          <label for="my-drawer" class="btn btn-square btn-ghost">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-6 h-6 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </label>
        </div> 
        <h1 class="text-center text-lg font-bold pl-2">
          {{ selectedTool }}
        </h1>
        <div class="flex justify-end flex-1 px-2">
          <div class="flex items-stretch">
            <div class="dropdown dropdown-end">
              <label tabindex="0" class="btn btn-ghost rounded-btn">
                <swatch-icon class="h-5 w-5 mr-2"></swatch-icon>
                <p>Theme</p>
                <chevron-down-icon class="h-5 w-5 ml-1"></chevron-down-icon>
              </label>
              <ul tabindex="0" class="menu dropdown-content p-2 shadow bg-primary rounded-box w-52 mt-4">
                <li @click="appStore.setTheme('dark')"><a>Dark</a></li> 
                <li @click="appStore.setTheme('light')"><a>Light</a></li>
                <li @click="appStore.setTheme('cupcake')"><a>Cupcake</a></li> 
                <li @click="appStore.setTheme('forest')"><a>Forest</a></li> 
                <li @click="appStore.setTheme('synthwave')"><a>Synthwave</a></li>
                <li @click="appStore.setTheme('night')"><a>Night</a></li>
                <li @click="appStore.setTheme('lofi')"><a>Lofi</a></li>
                <li @click="appStore.setTheme('winter')"><a>Winter</a></li>
                <li @click="appStore.setTheme('dracula')"><a>Dracula</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <!-- Page content here -->
      <slot name="tool-view"></slot>
    </div> 
    <div class="drawer-side">
      <label for="my-drawer" class="drawer-overlay"></label> 
      <ul class="menu p-4 w-80 min-h-full bg-base-100 justify-between">
        <!-- Sidebar content here -->
        <div class="space-y-1">
          <li class="pb-10">
            <a @click="goToWebsite" target="_blank" class="bg-base-100">
              <img v-if="appStore.themeType === 'dark'" src="../assets/img/mcintyreIconDark.png" class="thumbnail" style="max-width: 45px; padding-right: 5px;" />
              <img v-else src="../assets/img/mcintyreIconLight.png" style="max-width: 45px; padding-right: 5px;" />
              <p class="text-lg font-bold">McSwiss</p>
            </a>
          </li>
          <li @click="handleNavBtnClick(tools.previewGen)">
            <div :class="selectedTool === tools.previewGen ? 'w-full indicator' + ' bg-base-300' : 'w-full indicator'">
              <!-- <span class="indicator-item indicator-middle indicator-end badge badge-success mr-5"></span> -->
              <!-- <router-link to="/"> -->
                {{ tools.previewGen }}
              <!-- </router-link> -->
            </div>
          </li>
          <li @click="handleNavBtnClick(tools.segmentGen)">
            <div :class="selectedTool === tools.segmentGen ? 'w-full indicator' + ' bg-base-300' : 'w-full indicator'">
              <!-- <span class="indicator-item indicator-middle indicator-end badge badge-success mr-5"></span> -->
              <router-link to="/segment-gen">
                {{ tools.segmentGen }}
              </router-link>
            </div>
          </li>

          <li><a>Hyper Thumbnail Generator</a></li>
          <li><a>Transcript Generator</a></li>
          <li><a>Video Converter</a></li>
        </div>
        <div>
          <li>
            <a>
              <adjustments-horizontal-icon class="h-5 w-5 ml-1"></adjustments-horizontal-icon>
              Settings
            </a>
          </li>
        </div>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { SwatchIcon, ChevronDownIcon, AdjustmentsHorizontalIcon } from '@heroicons/vue/20/solid';
import { useAppStore } from '../stores/appStore';
import { Tool } from '../types/Tool';
 
export default defineComponent({
  name: 'McDrawer',
  components: {
    ChevronDownIcon,
    SwatchIcon,
    AdjustmentsHorizontalIcon
  },
  emits: ["theme-change"],
  setup() {
    const appStore = useAppStore();
    return { appStore }
  },
  data(){
    return {
      drawerOpen: true as boolean,
      logo: "../assets/img/mcintyreIconDark.png" as string,
      theme: "" as string,
      selectedTool: "Preview Generator",
      tools: {
        previewGen: "Preview Generator" as Tool,
        segmentGen: "Segment Generator" as Tool,
        thumbnailGen: "Thumbnail Generator" as Tool,
        hypThumbnailGen: "Hyper Thumbnail Generator" as Tool,
        transcriptGen: "Transcription Generator" as Tool,
        videoConvertor: "Video Converter" as Tool,
      }
    }
  },
  mounted(){
    console.log("hello");
    this.selectedTool = this.appStore.selectedTool;
  },
  computed: {
    renderLogo(){
      if (this.appStore.themeType === 'dark'){
        this.logo = "../assets/img/mcintyreIconDark.png";
      } else {
        this.logo = "../assets/img/mcintyreIconLight.png";
      }
    },
  },
  methods: {
    handleDrawerBtn() {
      console.log('ive been clicked: ' + this.drawerOpen)
    },
    goToWebsite() {
      // @ts-ignore
      require('electron').shell.openExternal("https://mcintyre.ca/");
    },
    selectedToolClass(selectedTool: Tool): string {
      if (this.appStore.selectedTool === selectedTool) {
        return 'bg-primary';
      } else {
        return '';
      }
    },
    handleNavBtnClick(tool: Tool){
      this.drawerOpen = false;
      this.selectedTool = tool;
      this.$router.push({ name: tool});
    },
  }
});
</script>
<style>

/*  
  Had to add this manually due to a bug, 
  in the future id like to remove by replacing
  all usages of d-toggle in the template
  with 'drawer-toggle' 

  BEGINNING OF BUG FIX:
*/
.d-toggle {
  position: fixed;
  height: 0px;
  width: 0px;
  appearance: none;
  opacity: 0;
}
.d-toggle:checked ~ .drawer-side {
  pointer-events: auto;
  visibility: visible;
}
.d-toggle:checked ~ .drawer-side > *:not(.drawer-overlay) {
  transform: translateX(0%);
}
.drawer-end .d-toggle ~ .drawer-content {
  grid-column-start: 1;
}
.drawer-end .d-toggle ~ .drawer-side {
  grid-column-start: 2;
  justify-items: end;
}
.drawer-end .d-toggle ~ .drawer-side > *:not(.drawer-overlay) {
  transform: translateX(100%);
}
.drawer-end .d-toggle:checked ~ .drawer-side > *:not(.drawer-overlay) {
  transform: translateX(0%);
}
.d-toggle:checked ~ .drawer-side > .drawer-overlay {
  background-color: hsl(0 0% 0%/0.4);
}
.d-toggle:focus-visible ~ .drawer-content label.drawer-button {
  outline-style: solid;
  outline-width: 2px;
  outline-offset: 2px;
}
.drawer-open > .d-toggle {
  display: none;
}
.drawer-open > .d-toggle ~ .drawer-side {
  pointer-events: auto;
  visibility: visible;
  position: sticky;
  display: block;
  width: auto;
  overscroll-behavior: auto;
}
.drawer-open > .d-toggle ~ .drawer-side > *:not(.drawer-overlay) {
  transform: translateX(0%);
}
[dir="rtl"] .drawer-open > .d-toggle ~ .drawer-side > *:not(.drawer-overlay) {
  transform: translateX(0%);
}
.drawer-open > .d-toggle:checked ~ .drawer-side {
  pointer-events: auto;
  visibility: visible;
}
.drawer-open > .d-toggle ~ .drawer-side > .drawer-overlay {
  cursor: default;
 background-color: transparent;
}
/* END OF BUG FIX */

.thumbnail {
  image-rendering: pixelated;
}



</style>