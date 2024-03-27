import { RouteRecordRaw } from 'vue-router';
import PreviewGen from '../views/PreviewGen.vue';
import HyperThumbnailGen from '../views/HyperThumbnailGen.vue';
import SegmentGen from '../views/SegmentGen.vue';
import VideoConverter from '../views/VideoConverter.vue';
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
    path: '/settings',
    name: 'Settings',
    component: SettingsView,
  }
];

export default routes;
