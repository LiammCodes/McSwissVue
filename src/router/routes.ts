import { RouteRecordRaw } from 'vue-router';
import WorkspaceView from '../views/WorkspaceView.vue';
import SettingsView from '../views/SettingsView.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Workspace',
    component: WorkspaceView,
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView,
  },
];

export default routes;
