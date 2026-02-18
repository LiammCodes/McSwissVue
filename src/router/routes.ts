import { RouteRecordRaw } from 'vue-router';
import PreviewGen from '../views/PreviewGen.vue';
import HyperThumbnailGen from '../views/HyperThumbnailGen.vue';
import SegmentGen from '../views/SegmentGen.vue';
import VideoConverter from '../views/VideoConverter.vue';
import TranscriptGenerator from '../views/TranscriptGenerator.vue';
import TranscriptEditor from '../views/TranscriptEditor.vue';
import SettingsView from '../views/SettingsView.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Preview Generator',
    component: PreviewGen,
  },
  {
    path: '/hyper-thumbnail-gen',
    name: 'Hyper Thumbnail Generator',
    component: HyperThumbnailGen,
  },
  {
    path: '/segment-gen',
    name: 'Segment Generator',
    component: SegmentGen,
  },
  {
    path: '/video-converter',
    name: 'Video Converter',
    component: VideoConverter,
  },
  {
    path: '/transcript-generator',
    name: 'Transcript Generator',
    component: TranscriptGenerator,
  },
  {
    path: '/transcript-editor',
    name: 'Transcript Editor',
    component: TranscriptEditor,
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView,
  }
];

export default routes;
