import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import Login from '../views/Login.vue';
import Register from '../views/Register.vue';
import Dashboard from '../views/Dashboard.vue';
import Users from '../views/Users.vue';
import MapCesium from '../views/MapCesium.vue';
import Workflow from '../views/Workflow.vue';
import Setting from '../views/Setting.vue';
import Roles from '../views/Roles.vue';
import Groups from '../views/Groups.vue';
import processBuilder from '../views/ProcessBuilder.vue';
import Inbox from '../views/UserInbox.vue';
import StartProc from '../views/StartProcess.vue';

import FormList from '../views/formbuilder/FormList.vue';
import FormEditor from '../views/formbuilder/FormEditor.vue';
import FormPreview from '../views/formbuilder/FormPreview.vue';
import FormFill from '../views/formbuilder/FormFill.vue';
import FormSubmissions from '../views/formbuilder/FormSubmissions.vue';
const routes = [
  { path: '/', redirect: '/map' },
  { path: '/login', name: 'Login', component: Login, meta: { requiresGuest: true } },
  { path: '/register', name: 'Register', component: Register, meta: { requiresGuest: true } },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/users', name: 'Users', component: Users, meta: { requiresAuth: true, permission: 'view_users' } },
  { path: '/roles', name: 'Roles', component: Roles, meta: { requiresAuth: true, permission: 'view_roles' } },
  { path: '/groups', name: 'Groups', component: Groups, meta: { requiresAuth: true, permission: 'view_roles' } },
  { path: '/map/:token?', name: 'MapCesium', component: MapCesium },
  { path: '/setting', name: 'Setting', component: Setting, meta: { requiresAuth: true, permission: 'setting' } },
  { path: '/workflow', name: 'workflow', component: Workflow, meta: { requiresAuth: true, permission: 'workflow' } },
  { path: '/process', name: 'processBuilder', component: processBuilder, meta: { requiresAuth: true, permission: 'works_layers' } },
  { path: '/inbox', name: 'Inbox', component: Inbox, meta: { requiresAuth: true, permission: 'Inbox' } },
  { path: '/startProc', name: 'StartProc', component: StartProc, meta: { requiresAuth: true, permission: 'Inbox' } },
  { path: '/forms', name: 'FormList', component: FormList, meta: { requiresAuth: true } },
  { path: '/forms/new', name: 'FormNew', component: FormEditor, meta: { requiresAuth: true } },
  { path: '/forms/:id/edit', name: 'FormEdit', component: FormEditor, meta: { requiresAuth: true } },
  { path: '/forms/:id/preview', name: 'FormPreview', component: FormPreview, meta: { requiresAuth: true } },
  { path: '/forms/:id/submissions', name: 'FormSubmissions', component: FormSubmissions, meta: { requiresAuth: true } },
  { path: '/f/:id', name: 'FormFill', component: FormFill, meta: { public: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  await authStore.checkAuth();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/map');
  } else if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next('/map');
  } else if (to.meta.permission && !authStore.hasPermission(to.meta.permission as string)) {
    next('/map');
  } else {
    next();
  }
});

export default router;
