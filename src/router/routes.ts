import { RouteRecordRaw } from 'vue-router';
import PreviewGen from '../views/PreviewGen.vue';
import SegmentGen from '../views/SegmentGen.vue';

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
];

export default routes;
