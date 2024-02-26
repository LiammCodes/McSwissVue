import { RouteRecordRaw } from 'vue-router';
import PreviewGen from '../views/PreviewGen.vue';
import SegmentGen from '../views/SegmentGen.vue';
import SettingsView from '../views/SettingsView.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Preview Generator',
    component: PreviewGen,
  },
  {
    path: '/segment-gen',
    name: 'Segment Generator',
    component: SegmentGen,
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView,
  }
];

export default routes;
