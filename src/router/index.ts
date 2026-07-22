import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

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

const PUBLIC_ROUTES = ['/login', '/register', '/mapbox'];

const routes = [
  { path: '/', redirect: '/mapbox' },
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
    meta: { requiresAuth: true, permission: 'view_dashboard' }
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
    path: '/map/:token?',
    name: 'MapCesium',
    component: MapCesium,
    meta: { requiresAuth: true, requiredRole: 'admin' }
  },
  {
    path: '/mapbox/:token?',
    name: 'MapMapbox',
    component: MapMapbox
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
    redirect: '/mapbox'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

let isInitialNavigation = true

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  const isPublicRoute = to.meta.public === true || PUBLIC_ROUTES.includes(to.path)

  if (isInitialNavigation) {
    await authStore.checkAuth()
    isInitialNavigation = false
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
  }

  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    return next('/mapbox')
  }

  if (to.meta.requiredRole) {
    const requiredRole = to.meta.requiredRole as string
    if (requiredRole === 'admin' && !authStore.isAdmin) {
      return next('/dashboard')
    }
    if (requiredRole === 'group_manager' && !authStore.isGroupManager && !authStore.isAdmin) {
      return next('/dashboard')
    }
  }

  if (to.meta.permission) {
    const permission = to.meta.permission as string
    if (!authStore.hasPermission(permission)) {
      return next('/dashboard')
    }
  }

  if (to.path === '/map' && to.params.token) {
    const token = to.params.token as string
    if (token && !/^[a-zA-Z0-9\-_]+$/.test(token)) {
      return next('/map')
    }
  }

  if (to.path === '/mapbox' && to.params.token) {
    const token = to.params.token as string
    if (token && !/^[a-zA-Z0-9\-_]+$/.test(token)) {
      return next('/mapbox')
    }
  }

  next()
});

router.afterEach((to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    window.location.href = '/login'
  }
});

export default router;
