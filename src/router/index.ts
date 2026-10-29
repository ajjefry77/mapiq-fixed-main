import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { logger, EV } from '../logger';
import { isPublicRoute } from '../constants/publicRoutes';

const Login = () => import('../views/Login.vue');
const Register = () => import('../views/Register.vue');
const Dashboard = () => import('../views/Dashboard.vue');
const Users = () => import('../views/Users.vue');
const MapCesium = () => import('../views/MapCesium.vue');
const MapMapbox = () => import('../views/MapMapbox.vue');
const Workflow = () => import('../views/Workflow.vue');
const Setting = () => import('../views/Setting.vue');
const Roles = () => import('../views/Roles.vue');
const Groups = () => import('../views/Groups.vue');
const processBuilder = () => import('../views/ProcessBuilder.vue');
const Inbox = () => import('../views/UserInbox.vue');
const StartProc = () => import('../views/StartProcess.vue');

const FormList = () => import('../views/formbuilder/FormList.vue');
const FormEditor = () => import('../views/formbuilder/FormEditor.vue');
const FormPreview = () => import('../views/formbuilder/FormPreview.vue');
const FormFill = () => import('../views/formbuilder/FormFill.vue');
const FormSubmissions = () => import('../views/formbuilder/FormSubmissions.vue');

const PermissionLayers = () => import('../views/PermissionLayers.vue');
const WorksLayers = () => import('../views/WorksLayers.vue');
const WalletCharge = () => import('../views/WalletCharge.vue');
const NotFound = () => import('../views/NotFound.vue');

const SITE_TITLE = 'Map IQ';

const routes = [
  { path: '/', redirect: '/baseMap' },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresGuest: true, public: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { requiresGuest: true, public: true }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/wallet/charge',
    name: 'WalletCharge',
    component: WalletCharge,
    meta: { requiresAuth: true }
  },
  {
    path: '/users',
    name: 'Users',
    component: Users,
    meta: { requiresAuth: true, permission: 'view_users', requiredRole: 'admin' }
  },
  {
    path: '/roles',
    name: 'Roles',
    component: Roles,
    meta: { requiresAuth: true, permission: 'view_roles', requiredRole: 'admin' }
  },
  {
    path: '/groups',
    name: 'Groups',
    component: Groups,
    meta: { requiresAuth: true, permission: 'view_groups' }
  },
  {
    path: '/map3D/:token?',
    name: 'MapCesium',
    component: MapCesium
  },
  {
    path: '/baseMap/:token?',
    name: 'MapMapbox',
    component: MapMapbox
  },
  // سازگاری با مسیرهای قبلی
  {
    path: '/map/:token?',
    redirect: (to) => to.params.token ? `/baseMap/${to.params.token}` : '/baseMap'
  },
  {
    path: '/mapbox/:token?',
    redirect: (to) => to.params.token ? `/baseMap/${to.params.token}` : '/baseMap'
  },
  {
    path: '/setting',
    name: 'Setting',
    component: Setting,
    meta: { requiresAuth: true, permission: 'setting', requiredRole: 'admin' }
  },
  {
    path: '/workflow',
    name: 'workflow',
    component: Workflow,
    meta: { requiresAuth: true, permission: 'workflow' }
  },
  {
    path: '/process',
    name: 'processBuilder',
    component: processBuilder,
    meta: { requiresAuth: true, permission: 'works_layers' }
  },
  {
    path: '/inbox',
    name: 'Inbox',
    component: Inbox,
    meta: { requiresAuth: true, permission: 'Inbox' }
  },
  {
    path: '/startProc',
    name: 'StartProc',
    component: StartProc,
    meta: { requiresAuth: true, permission: 'Inbox' }
  },
  {
    path: '/forms',
    name: 'FormList',
    component: FormList,
    meta: { requiresAuth: true, permission: 'view_forms' }
  },
  {
    path: '/forms/new',
    name: 'FormNew',
    component: FormEditor,
    meta: { requiresAuth: true, permission: 'manage_forms' }
  },
  {
    path: '/forms/:id/edit',
    name: 'FormEdit',
    component: FormEditor,
    meta: { requiresAuth: true, permission: 'manage_forms' }
  },
  {
    path: '/forms/:id/preview',
    name: 'FormPreview',
    component: FormPreview,
    meta: { requiresAuth: true, permission: 'view_forms' }
  },
  {
    path: '/forms/:id/submissions',
    name: 'FormSubmissions',
    component: FormSubmissions,
    meta: { requiresAuth: true, permission: 'view_submissions' }
  },
  {
    path: '/f/:id',
    name: 'FormFill',
    component: FormFill,
    meta: { public: true }
  },
  {
    path: '/permission-layers',
    name: 'PermissionLayers',
    component: PermissionLayers,
    meta: { requiresAuth: true, permission: 'manage_permissions', requiredRole: 'admin' }
  },
  {
    path: '/works-layers',
    name: 'WorksLayers',
    component: WorksLayers,
    meta: { requiresAuth: true, permission: 'works_layers' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
    meta: { public: true, title: `۴۰۴ | ${SITE_TITLE}` }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
});

let isInitialNavigation = true

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  if (isInitialNavigation) {
    await authStore.checkAuth()
    isInitialNavigation = false
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({
      path: '/baseMap',
      query: { redirect: to.fullPath }
    })
  }

  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    return next('/baseMap')
  }

  if (to.meta.public === true && isPublicRoute(to.path)) {
    return next();
  }

  if (to.meta.requiredRole && !authStore.isRole(String(to.meta.requiredRole))) {
    return next('/baseMap')
  }

  if (to.meta.permission && !authStore.hasPermission(String(to.meta.permission))) {
    return next('/baseMap')
  }

  next()
});

router.afterEach((to, from) => {
  try {
    const title = to.meta?.title as string | undefined;
    document.title = title ?? (to.name === 'NotFound' ? `۴۰۴ | ${SITE_TITLE}` : SITE_TITLE);
  } catch { /* noop */ }
  logger.info(EV.ROUTE_ENTER, {
    to: to.fullPath,
    name: String(to.name ?? ''),
    from: from.fullPath,
  })
})

router.onError((error, to) => {
  logger.error(EV.ROUTE_NAVIGATION_FAILED, {
    to: to.fullPath,
    name: String(to.name ?? ''),
  }, error)
})

export default router;
