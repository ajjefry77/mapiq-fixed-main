<!-- this a test -->
<template>
  <div class="page">
    <div class="db-header">
      <div>
        <h1 class="db-title">
          {{
            isAdmin
              ? "داشبورد"
              : isGroupManager
                ? "پنل مدیر گروه"
                : "پنل کاربری"
          }}
        </h1>
        <p class="db-sub">خوش آمدید، {{ authStore.user?.name }}</p>
      </div>
      <span class="badge badge-active">{{ roleLabel }}</span>
    </div>

    <!-- Stats overview -->
    <div v-if="isAdmin" class="stats-row">
      <div class="stat-card">
        <div class="stat-icon stat-icon--accent"><i class="fas fa-users"></i></div>
        <div class="stat-body">
          <span class="stat-value">{{ stats.users }}</span>
          <span class="stat-label">کاربران</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--success"><i class="fas fa-user-tag"></i></div>
        <div class="stat-body">
          <span class="stat-value">{{ stats.roles }}</span>
          <span class="stat-label">نقش‌ها</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--info"><i class="fas fa-layer-group"></i></div>
        <div class="stat-body">
          <span class="stat-value">{{ stats.groups }}</span>
          <span class="stat-label">گروه‌ها</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--warning"><i class="fas fa-file-alt"></i></div>
        <div class="stat-body">
          <span class="stat-value">{{ stats.forms }}</span>
          <span class="stat-label">فرم‌ها</span>
        </div>
      </div>
    </div>

    <!-- Quality stats for group-manager / regular user -->
    <div v-else class="stats-row">
      <div class="stat-card">
        <div class="stat-icon stat-icon--info"><i class="fas fa-layer-group"></i></div>
        <div class="stat-body">
          <span class="stat-value">{{ groups.length }}</span>
          <span class="stat-label">گروه‌ها</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--warning"><i class="fas fa-file-alt"></i></div>
        <div class="stat-body">
          <span class="stat-value">{{ forms.length }}</span>
          <span class="stat-label">فرم‌ها</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--accent"><i class="fas fa-wallet"></i></div>
        <div class="stat-body">
          <span class="stat-value" dir="ltr">{{ formatMoney(walletBalance) }}</span>
          <span class="stat-label">موجودی کیف پول</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--success"><i class="fas fa-calendar-alt"></i></div>
        <div class="stat-body">
          <span class="stat-value stat-value--sm">{{ jToday }}</span>
          <span class="stat-label">تاریخ امروز</span>
        </div>
      </div>
    </div>


    <!-- کیف پول -->
    <!-- <div class="card" style="margin-top: 16px; padding: 12px 16px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
      <div style="display:flex; align-items:center; gap:8px; font-size:13px;">
        <i class="fas fa-wallet" style="color:#c2410c;"></i>
        <span style="color:#71717a;">موجودی:</span>
        <strong style="color:#c2410c; direction:ltr;">{{ formatMoney(walletBalance) }}</strong>
        <span style="color:#9a3412; font-size:12px;">ریال</span>
      </div>
      <button class="btn btn-primary btn-sm" @click="$router.push('/wallet/charge')">
        <i class="fas fa-plus" style="margin-left:4px;"></i> افزایش موجودی
      </button>
    </div> -->

    <!-- ADMIN -->
    <div v-if="isAdmin">
      <div class="info-row">
        <div class="info-item">
          <span class="info-label">نام</span>
          <span class="info-value">{{ authStore.user?.name }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">تلفن</span>
          <span class="info-value" dir="ltr">{{ authStore.user?.phone }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">نام کاربری</span>
          <span class="info-value">{{ authStore.user?.username }}</span>
        </div>
      </div>

      <div class="shortcuts">
        <div class="shortcut" @click="$router.push('/users')">
          <i class="fas fa-users"></i>
          <span>کاربران</span>
        </div>
        <div class="shortcut" @click="$router.push('/roles')">
          <i class="fas fa-user-tag"></i>
          <span>نقش‌ها</span>
        </div>
        <div class="shortcut" @click="$router.push('/groups')">
          <i class="fas fa-layer-group"></i>
          <span>گروه‌ها</span>
        </div>
        <div class="shortcut" @click="$router.push('/forms')">
          <i class="fas fa-file-alt"></i>
          <span>فرم‌ها</span>
        </div>
        <div class="shortcut" @click="$router.push('/setting')">
          <i class="fas fa-cog"></i>
          <span>تنظیمات</span>
        </div>
      </div>
    </div>

    <!-- GROUP MANAGER -->
    <div v-else-if="isGroupManager">
      <div class="info-row">
        <div class="info-item">
          <span class="info-label">نام</span>
          <span class="info-value">{{ authStore.user?.name }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">تلفن</span>
          <span class="info-value" dir="ltr">{{ authStore.user?.phone }}</span>
        </div>
      </div>

      <!-- <div class="shortcuts">
        <div class="shortcut" @click="$router.push('/groups')">
          <i class="fas fa-layer-group"></i>
          <span>گروه‌های من</span>
        </div>
        <div class="shortcut" @click="$router.push('/forms')">
          <i class="fas fa-file-alt"></i>
          <span>فرم‌های من</span>
        </div>
      </div> -->

      <div class="gm-sections">
        <div class="card mini-card">
          <div class="card-title-row">
            <h3 class="card-title">
              <i class="fas fa-layer-group"></i> گروه‌های من
            </h3>
            <button
              class="btn btn-primary btn-sm"
              @click="$router.push('/groups')"
            >
              <i class="fas fa-plus" style="margin-left: 4px"></i> ایجاد گروه
            </button>
          </div>
          <div v-if="groups.length === 0" class="empty-sm">
            هنوز گروهی نساخته‌اید
          </div>
          <div v-else class="mini-list">
            <div
              v-for="g in groups"
              :key="g.id"
              class="mini-item"
              @click="$router.push('/groups')"
            >
              <span
                ><i
                  class="fas fa-users"
                  style="
                    margin-left: 6px;
                    font-size: 11px;
                    color: var(--accent);
                  "
                ></i
                >{{ g.name }}</span
              >
              <span class="mini-count">{{ g.Users?.length || 0 }} عضو</span>
            </div>
          </div>
        </div>
        <div class="card mini-card">
          <div class="card-title-row">
            <h3 class="card-title">
              <i class="fas fa-file-alt"></i> فرم‌های من
            </h3>
            <button
              class="btn btn-primary btn-sm"
              @click="$router.push('/forms/new')"
            >
              <i class="fas fa-plus" style="margin-left: 4px"></i> ایجاد فرم
            </button>
          </div>
          <div v-if="forms.length === 0" class="empty-sm">
            هنوز فرمی نساخته‌اید
          </div>
          <div v-else class="mini-list">
            <div
              v-for="f in forms"
              :key="f.id"
              class="mini-item"
              @click="$router.push(`/forms/${f.id}/preview`)"
            >
              <span>{{ f.title || "بدون عنوان" }}</span>
              <i
                class="fas fa-chevron-left"
                style="font-size: 10px; color: var(--text-muted)"
              ></i>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- REGULAR USER -->
    <div v-else>
      <div class="user-dash">
        <div class="user-dash-main">
          <div class="card user-card">
            <h3 class="card-title">
              <i class="fas fa-user-edit"></i> ویرایش اطلاعات
            </h3>
            <div class="profile-form profile-form--grid">
              <div class="form-row">
                <label>نام</label>
                <input v-model="profileForm.name" class="input" />
              </div>
              <div class="form-row">
                <label>تلفن</label>
                <input v-model="profileForm.phone" class="input" dir="ltr" />
              </div>
              <div class="form-row">
                <label>کد ملی</label>
                <input v-model="profileForm.code" class="input" dir="ltr" />
              </div>
              <div class="form-row">
                <label>رمز عبور جدید</label>
                <input
                  v-model="profileForm.password"
                  type="password"
                  class="input"
                  placeholder="اختیاری"
                />
              </div>
              <button
                class="btn btn-primary profile-save"
                @click="updateProfile"
                :disabled="saving"
              >
                {{ saving ? "در حال ذخیره..." : "ذخیره" }}
              </button>
            </div>
          </div>

          <div class="card user-card">
            <h3 class="card-title">
              <i class="fas fa-users"></i> گروه‌های من
            </h3>
            <div v-if="groups.length === 0" class="empty-sm">
              عضو گروهی نیستید
            </div>
            <div v-else class="group-list">
              <div v-for="g in groups" :key="g.id" class="group-item">
                <div class="group-avatar">
                  <i class="fas fa-users"></i>
                </div>
                <div class="group-info">
                  <span class="group-name">{{ g.name }}</span>
                  <span v-if="g.description" class="group-desc">{{
                    g.description
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="user-dash-side">
          <div class="card user-card">
            <h3 class="card-title">
              <i class="fas fa-file-alt"></i> فرم‌های من
            </h3>
            <div v-if="forms.length === 0" class="empty-sm">
              فرمی اختصاص ندارد
            </div>
            <div v-else class="mini-list">
              <div
                v-for="f in forms"
                :key="f.id"
                class="mini-item"
                @click="$router.push('/f/' + f.id)"
              >
                <span>{{ f.title || "بدون عنوان" }}</span>
                <i class="fas fa-chevron-left"></i>
              </div>
            </div>
          </div>

          <div class="widget-row">
            <div class="card widget">
              <h3 class="card-title compact-title">
                <i class="fas fa-wallet" style="color: #c2410c"></i> کیف پول
              </h3>
              <div class="wallet-body">
                <span class="wallet-value" dir="ltr">{{ formatMoney(walletBalance) }}</span>
                <span class="wallet-unit">ریال</span>
              </div>
              <button
                class="btn btn-primary btn-sm"
                :disabled="walletLoading"
                @click="requestCharge"
              >
                <i class="fas fa-plus" style="margin-left: 4px"></i> افزایش موجودی
              </button>
            </div>

            <div class="card widget">
              <h3 class="card-title compact-title">
                <i class="fas fa-cloud-sun" style="color: var(--accent)"></i> آب‌وهوا
              </h3>
              <div v-if="weatherError" class="empty-sm">{{ weatherError }}</div>
              <div v-else-if="!weather" class="empty-sm">در حال دریافت...</div>
              <div v-else class="weather-body">
                <div class="weather-top">
                  <span class="weather-temp" dir="ltr">{{ weather.temp }}°</span>
                  <span class="weather-desc">{{ weather.desc }}</span>
                </div>
                <div class="weather-meta">
                  <span title="بیشینه / کمینه">↑<b dir="ltr">{{ weather.tmax }}°</b> ↓<b dir="ltr">{{ weather.tmin }}°</b></span>
                  <span title="سرعت باد"><i class="fas fa-wind"></i> <b dir="ltr">{{ weather.wind }}</b></span>
                </div>
              </div>
            </div>
          </div>

          <div class="card user-card">
            <h3 class="card-title compact-title">
              <i class="fas fa-calendar-alt" style="color: var(--accent)"></i> {{ jTodayFull }}
            </h3>
            <div class="cal-wrap">
              <div class="cal-header">
                <button class="btn btn-ghost btn-sm" @click="calShift(-1)"><i class="fas fa-chevron-right"></i></button>
                <span class="cal-title">{{ calTitle }}</span>
                <button class="btn btn-ghost btn-sm" @click="calShift(1)"><i class="fas fa-chevron-left"></i></button>
              </div>
              <div class="cal-grid">
                <div v-for="d in calWeek" :key="d" class="cal-cell cal-week">{{ d }}</div>
                <div
                  v-for="(c, i) in calCells"
                  :key="i"
                  class="cal-cell"
                  :class="{
                    'cal-other': c.other,
                    'cal-today': c.today
                  }"
                >{{ c.day }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import moment from "moment-jalaali";
moment.loadPersian({ usePersianDigits: true });
import { useAuthStore } from "../stores/auth";
import { useNotify } from "../composables/useNotify";
import axios from "axios";

const authStore = useAuthStore();
const SERVER = import.meta.env.VITE_SERVER;
const { success, handleError } = useNotify();

const isAdmin = computed(() => authStore.isAdmin);
const isGroupManager = computed(() => authStore.isGroupManager);

const roleLabel = computed(() => {
  if (isAdmin.value) return "مدیر سیستم";
  if (isGroupManager.value) return "مدیر گروه";
  return "کاربر";
});

const stats = computed(() => ({
  users: usersCount.value,
  roles: rolesCount.value,
  groups: groups.value.length,
  forms: forms.value.length,
}));

const forms = ref([]);
const groups = ref([]);
const saving = ref(false);
const profileForm = reactive({ name: "", phone: "", code: "", password: "" });

const usersCount = ref(0);
const rolesCount = ref(0);
const walletBalance = ref(0);
const walletLoading = ref(false);
const showCharge = ref(false);
const chargeAmount = ref(100000);

function formatMoney(n) {
  return (Number(n) || 0).toLocaleString("fa-IR");
}

async function loadWallet() {
  if (!authStore.user?.id) return;
  walletLoading.value = true;
  try {
    const res = await axios.get(SERVER + "/api/wallet/" + authStore.user.id, {
      headers: {
        Authorization:
          "Bearer " + (authStore.token || localStorage.getItem("token") || ""),
      },
    });
    walletBalance.value = res.data?.balance ?? res.data?.amount ?? 0;
  } catch (e) {
    const key = "wallet_" + authStore.user.id;
    walletBalance.value = Number(localStorage.getItem(key) || 0);
  } finally {
    walletLoading.value = false;
  }
}

async function requestCharge() {
  if (!chargeAmount.value || chargeAmount.value < 1000) {
    handleError?.(new Error("مبلغ نامعتبر"));
    return;
  }
  walletLoading.value = true;
  try {
    await axios.post(
      SERVER + "/api/wallet/charge",
      { amount: chargeAmount.value, userId: authStore.user?.id },
      {
        headers: {
          Authorization:
            "Bearer " + (authStore.token || localStorage.getItem("token") || ""),
        },
      },
    );
    success?.("درخواست شارژ ثبت شد");
    showCharge.value = false;
    await loadWallet();
  } catch (e) {
    const key = "wallet_" + authStore.user.id;
    const cur = Number(localStorage.getItem(key) || 0);
    localStorage.setItem(key, String(cur + Number(chargeAmount.value)));
    walletBalance.value = cur + Number(chargeAmount.value);
    success?.("موجودی به‌صورت محلی به‌روز شد");
    showCharge.value = false;
  } finally {
    walletLoading.value = false;
  }
}

async function loadProfile() {
  profileForm.name = authStore.user?.name || "";
  profileForm.phone = authStore.user?.phone || "";
  profileForm.code = authStore.user?.code || "";
  profileForm.password = "";
}

async function loadMyData() {
  try {
    if (isGroupManager.value) {
      const [formsRes, groupsRes] = await Promise.all([
        axios.get(SERVER + "/api/forms"),
        axios.get(SERVER + "/api/groups"),
      ]);
      forms.value = Array.isArray(formsRes.data)
        ? formsRes.data
        : formsRes.data?.data || [];
      const allGroups = Array.isArray(groupsRes.data)
        ? groupsRes.data
        : groupsRes.data?.data || [];
      const userId = String(authStore.user?.id);
      const hasManagerField = allGroups.some(
        (g) => getGroupManagerId(g) != null,
      );
      const myGroups = allGroups.filter((g) => {
        const mid = getGroupManagerId(g);
        return mid != null ? String(mid) === userId : !hasManagerField;
      });
      if (!isAdmin.value) {
        groups.value = myGroups;
        return;
      }
      groups.value = await Promise.all(
        myGroups.map(async (g) => {
          if (g.member_count != null) return g;
          if (Array.isArray(g.Users) || Array.isArray(g.users)) return { ...g, Users: g.Users ?? g.users, member_count: (g.Users ?? g.users).length };
          try {
            const r = await axios.get(SERVER + `/api/groups/${g.id}/users/`);
            const users = r.data?.data ?? r.data;
            return { ...g, Users: Array.isArray(users) ? users : [], member_count: Array.isArray(users) ? users.length : 0 };
          } catch {
            return { ...g, member_count: 0 };
          }
        }),
      );
    } else if (!isAdmin.value) {
      const [formsRes, meRes] = await Promise.all([
        axios.get(SERVER + "/api/forms").catch(() => ({ data: [] })),
        axios.get(SERVER + "/api/auth/me"),
      ]);
      forms.value = Array.isArray(formsRes.data)
        ? formsRes.data
        : Array.isArray(formsRes.data?.data)
          ? formsRes.data.data
          : [];
      const me = meRes.data?.data || meRes.data;
      const myGroups = me?.Groups ?? me?.groups ?? [];
      if (Array.isArray(myGroups) && myGroups.length) {
        groups.value = myGroups;
      } else if (me?.group_ids?.length) {
        groups.value = me.group_ids.map((id) => ({ id }));
      } else {
        groups.value = [];
      }
    } else {
      const [formsRes, meRes, usersRes, rolesRes] = await Promise.all([
        axios.get(SERVER + "/api/forms"),
        axios.get(SERVER + "/api/auth/me"),
        axios.get(SERVER + "/api/users").catch(() => null),
        axios.get(SERVER + "/api/roles").catch(() => null),
      ]);
      forms.value = Array.isArray(formsRes.data)
        ? formsRes.data
        : formsRes.data?.data || [];
      const userList = usersRes ? (Array.isArray(usersRes.data?.data || usersRes.data) ? (usersRes.data?.data || usersRes.data) : []) : [];
      const roleList = rolesRes ? (Array.isArray(rolesRes.data?.data || rolesRes.data) ? (rolesRes.data?.data || rolesRes.data) : []) : [];
      usersCount.value = userList.length;
      rolesCount.value = roleList.length;
      const me = meRes.data?.data || meRes.data;
      const myGroups = me?.Groups ?? me?.groups ?? [];
      if (Array.isArray(myGroups) && myGroups.length) {
        groups.value = myGroups;
      } else if (me?.group_ids?.length) {
        const gRes = await axios.get(SERVER + "/api/groups");
        const allGroups = Array.isArray(gRes.data)
          ? gRes.data
          : gRes.data?.data || [];
        groups.value = allGroups.filter((g) => me.group_ids.includes(g.id));
      }
    }
  } catch (e) {
    handleError(e);
  }
}

function getGroupManagerId(g) {
  return (
    g.manager_id ??
    g.created_by ??
    g.creator_id ??
    g.managed_by ??
    g.owner_id ??
    g.user_id ??
    g.manager?.id ??
    g.Manager?.id ??
    g.creator?.id ??
    g.createdBy
  );
}

async function updateProfile() {
  saving.value = true;
  try {
    const body = {
      full_name: profileForm.name,
      phone: profileForm.phone,
      code: profileForm.code || undefined,
    };
    if (profileForm.password) body.password = profileForm.password;
    await axios.put(SERVER + "/api/users/me", body);
    if (authStore.user) {
      authStore.user.name = profileForm.name;
      authStore.user.phone = profileForm.phone;
      authStore.user.code = profileForm.code;
    }
    success("ذخیره شد");
  } catch (e) {
    handleError(e);
  } finally {
    saving.value = false;
  }
}

// ---- تقویم شمسی ----
const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
function faNum(v) {
  return String(v).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}
const jToday = computed(() => faNum(moment().locale("fa").format("jD jMMMM jYYYY")));
const jTodayFull = computed(() => faNum(moment().locale("fa").format("jD jMMMM jYYYY")));
const calWeek = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const calYear = ref(moment().jYear());
const calMonth = ref(moment().jMonth());
const calCells = ref([]);
const calTitle = computed(() =>
  faNum(moment(`${calYear.value}/${calMonth.value + 1}/1`, "jYYYY/jM/jD").locale("fa").format("jMMMM jYYYY")),
);

function jalahliMonthDays(year, month0based) {
  // ماه‌ها ۰تا۵ (فروردین..شهریور) ۳۱ روز، ۶تا۱۰ (مهر..بهمن) ۳۰ روز، اسفند (۱۱) ۲۹/۳۰
  if (month0based <= 5) return 31;
  if (month0based <= 10) return 30;
  return moment.jIsLeapYear(year) ? 30 : 29;
}

function buildCalendar() {
  const first = moment(`${calYear.value}/${calMonth.value + 1}/1`, "jYYYY/jM/jD");
  const daysInMonth = jalahliMonthDays(calYear.value, calMonth.value);
  // هفته شمسی از شنبه شروع می‌شود؛ day(): 0=یکشنبه ... 6=شنبه
  const startWeekday = (first.day() + 1) % 7; // 0=شنبه، 1=یکشنبه ...
  const today = moment();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) {
    const prev = moment(first).subtract(startWeekday - i, "days");
    cells.push({ day: faNum(prev.jDate()), other: true, today: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const c = moment(`${calYear.value}/${calMonth.value + 1}/${d}`, "jYYYY/jM/jD");
    cells.push({
      day: faNum(d),
      other: false,
      today: c.format("jYYYY/jM/jD") === today.format("jYYYY/jM/jD"),
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: "", other: true, today: false });
  }
  calCells.value = cells;
}

function calShift(dir) {
  if (dir < 0) {
    calMonth.value -= 1;
    if (calMonth.value < 0) { calMonth.value = 11; calYear.value -= 1; }
  } else {
    calMonth.value += 1;
    if (calMonth.value > 11) { calMonth.value = 0; calYear.value += 1; }
  }
  buildCalendar();
}

// ---- وضعیت آب‌وهوا (open-meteo) ----
const weather = ref(null);
const weatherError = ref("");
// مختصات پیش‌فرض: تهران
const DEFAULT_COORDS = { lat: 35.6892, lng: 51.389 };

async function loadWeather() {
  try {
    let lat = DEFAULT_COORDS.lat;
    let lng = DEFAULT_COORDS.lng;
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 }),
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (_) {}
    }
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=" +
      lat +
      "&longitude=" +
      lng +
      "&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto";
    const res = await axios.get(url);
    const cw = res.data?.current_weather || {};
    const daily = res.data?.daily || {};
    weather.value = {
      temp: Math.round(cw.temperature ?? 0),
      wind: Math.round((cw.windspeed ?? 0) * 100) / 100,
      desc: "وضعیت فعلی",
      tmax: Math.round(daily.temperature_2m_max?.[0] ?? 0),
      tmin: Math.round(daily.temperature_2m_min?.[0] ?? 0),
    };
  } catch (e) {
    weatherError.value = "دریافت آب‌وهوا ممکن نشد";
  }
}

onMounted(() => {
  loadProfile();
  loadWallet();
  loadMyData();
  buildCalendar();
  loadWeather();
});
</script>

<style scoped>
.db-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.db-title {
  font-size: 20px;
  font-weight: 700;
}
.db-sub {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 2px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  background: linear-gradient(180deg, var(--surface), var(--bg-elevated));
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all var(--transition-base);
}

.stat-card:hover {
  border-color: var(--border-strong);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.stat-icon {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
}

.stat-icon--accent { background: var(--accent-glow); color: var(--accent); }
.stat-icon--success { background: var(--success-glow); color: var(--success); }
.stat-icon--info { background: var(--info-glow); color: var(--info); }
.stat-icon--warning { background: var(--warning-glow); color: var(--warning); }

.stat-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-value {
  font-size: 22px;
  font-weight: 800;
  line-height: 1.2;
  color: var(--text);
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
}

.info-row {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}
.info-item {
  flex: 1;
  background: var(--surface2);
  border-radius: var(--radius);
  padding: 12px 16px;
}
.info-label {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 4px;
}
.info-value {
  font-size: 14px;
  font-weight: 500;
}

.shortcuts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}
.shortcut {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 13px;
  color: var(--text-muted);
}
.shortcut i {
  font-size: 20px;
  color: var(--accent);
}
.shortcut:hover {
  border-color: var(--accent);
  color: var(--text);
  transform: translateY(-1px);
}

.profile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.profile-card {
  padding: 20px;
}
.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.card-title-row .card-title {
  margin-bottom: 0;
}
.card-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text);
}
.card-title i {
  color: var(--accent);
  font-size: 13px;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.form-row label {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 4px;
}
.msg {
  font-size: 12px;
  margin-top: 4px;
}
.msg-ok {
  color: var(--success);
}
.msg-err {
  color: var(--danger);
}

.side-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.gm-sections {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 24px;
}
.mini-card {
  padding: 16px;
}
.empty-sm {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  padding: 16px 0;
}
.mini-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 200px;
  overflow-y: auto;
}
.mini-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.12s;
}
.mini-item:hover {
  background: var(--surface2);
}
.mini-item i {
  font-size: 10px;
  color: var(--text-muted);
}
.mini-count {
  font-size: 11px;
  color: var(--text-muted);
}
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tag {
  background: var(--accent-glow);
  color: var(--accent);
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}
.group-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-height: 220px;
  overflow-y: auto;
}
.group-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 7px;
  background: var(--surface2);
  transition: background 0.12s;
}
.group-item:hover {
  background: var(--accent-glow);
}
.group-avatar {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-glow);
  color: var(--accent);
  font-size: 12px;
}
.group-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.group-name {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.group-desc {
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-dash {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 14px;
  align-items: start;
}
.user-dash-main,
.user-dash-side {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.user-card {
  padding: 16px;
}
.widget-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.widget {
  padding: 14px;
}
.stat-value--sm {
  font-size: 14px;
}

/* فرم پروفایل فشرده: دو ستونه */
.profile-form--grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.profile-form--grid .profile-save {
  grid-column: 1 / -1;
  justify-self: stretch;
}

/* ردیف فشرده کیف پول / آب‌وهوا */
.compact-title {
  font-size: 13px;
  margin-bottom: 8px;
}
.wallet-body {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 4px 0 10px;
}
.wallet-value {
  font-size: 20px;
  font-weight: 800;
  color: #c2410c;
}
.wallet-unit {
  font-size: 11px;
  color: var(--text-muted);
}
.weather-body {
  margin: 2px 0 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.weather-top {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.weather-temp {
  font-size: 26px;
  font-weight: 800;
  color: var(--accent);
  line-height: 1;
}
.weather-desc {
  font-size: 12px;
  color: var(--text-muted);
}
.weather-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
  flex-wrap: wrap;
}
.weather-meta i {
  font-size: 11px;
}
.cal-wrap {
  margin-top: 2px;
}
.cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.cal-title {
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
}
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.cal-cell {
  text-align: center;
  padding: 3px 0;
  border-radius: 5px;
  font-size: 12px;
}
.cal-week {
  color: var(--text-muted);
  font-weight: 600;
  font-size: 11px;
}
.cal-other {
  color: var(--text-muted);
  opacity: .35;
}
.cal-today {
  background: var(--accent);
  color: #fff;
  font-weight: 700;
}

@media (max-width: 768px) {
  .db-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .info-row {
    flex-direction: column;
    gap: 8px;
  }
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .stat-value {
    font-size: 18px;
  }
  .shortcuts {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .shortcut {
    padding: 16px 12px;
    font-size: 12px;
  }
  .shortcut i {
    font-size: 18px;
  }
  .profile-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .db-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .user-dash {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .widget-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .gm-sections {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .profile-card,
  .mini-card {
    padding: 16px;
  }
}
@media (max-width: 400px) {
  .shortcuts {
    grid-template-columns: 1fr;
  }
  .db-title {
    font-size: 17px;
  }
}
</style>
