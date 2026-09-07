<template>
  <div class="page db-page">
    <!-- HERO -->
    <section class="hero card">
      <div class="hero-bg"></div>
      <div class="hero-main">
        <div class="avatar">{{ (authStore.user?.name || "ک")[0] }}</div>
        <div class="hero-text">
          <div class="hero-eyebrow">
            <span class="badge badge-active">{{ roleLabel }}</span
            ><span class="hero-date"
              ><i class="far fa-calendar-alt"></i> {{ jToday }}</span
            >
          </div>
          <h1 class="hero-title">
            {{
              isAdmin
                ? "داشبورد مدیریت"
                : isGroupManager
                  ? "پنل مدیر گروه"
                  : "پنل کاربری"
            }}
            👋
          </h1>
          <p class="hero-sub">
            خوش آمدید، <b>{{ authStore.user?.name || "کاربر" }}</b> — از اینجا
            همه‌چیز را یک‌جا مدیریت کنید.
          </p>
        </div>
      </div>
    </section>

    <div class="db-grid">
      <!-- MAIN -->
      <div class="db-main">
        <!-- ADMIN quick access -->
        <section v-if="isAdmin" class="db-card card">
          <div class="db-card-head">
            <h3><i class="fas fa-bolt"></i> دسترسی سریع</h3>
          </div>
          <div class="quick-grid">
            <div class="quick" @click="$router.push('/users')">
              <span class="quick-ic quick-ic--accent"
                ><i class="fas fa-users"></i></span
              ><b>کاربران</b><small>مدیریت اعضا</small>
            </div>
            <div class="quick" @click="$router.push('/roles')">
              <span class="quick-ic quick-ic--success"
                ><i class="fas fa-user-tag"></i></span
              ><b>نقش‌ها</b><small>سطوح دسترسی</small>
            </div>
            <div class="quick" @click="$router.push('/groups')">
              <span class="quick-ic quick-ic--info"
                ><i class="fas fa-layer-group"></i></span
              ><b>گروه‌ها</b><small>تیم‌ها و اعضا</small>
            </div>
            <div class="quick" @click="$router.push('/forms')">
              <span class="quick-ic quick-ic--warning"
                ><i class="fas fa-file-alt"></i></span
              ><b>فرم‌ها</b><small>ساخت و پاسخ‌ها</small>
            </div>
            <div class="quick" @click="$router.push('/mapbox')">
              <span class="quick-ic quick-ic--map"
                ><i class="fas fa-map-marked-alt"></i></span
              ><b>نقشه</b><small>مشاهده مکانی</small>
            </div>
            <div class="quick" @click="$router.push('/setting')">
              <span class="quick-ic quick-ic--muted"
                ><i class="fas fa-cog"></i></span
              ><b>تنظیمات</b><small>پیکربندی</small>
            </div>
          </div>
        </section>

        <!-- ADMIN lists -->
        <section v-if="isAdmin" class="db-cols">
          <div class="db-card card">
            <div class="db-card-head">
              <h3><i class="fas fa-layer-group"></i> گروه‌های اخیر</h3>
              <button class="link-btn" @click="$router.push('/groups')">
                همه ←
              </button>
            </div>
            <div v-if="!groups.length" class="empty-sm">گروهی ثبت نشده</div>
            <div v-else class="rows">
              <div
                v-for="g in groups.slice(0, 5)"
                :key="g.id"
                class="row-item"
                @click="$router.push('/groups')"
              >
                <span class="row-ava"><i class="fas fa-users"></i></span>
                <span class="row-txt"
                  ><b>{{ g.name }}</b
                  ><small>{{ g.description || "بدون توضیح" }}</small></span
                >
                <i class="fas fa-chevron-left row-arrow"></i>
              </div>
            </div>
          </div>
          <div class="db-card card">
            <div class="db-card-head">
              <h3><i class="fas fa-file-alt"></i> فرم‌های اخیر</h3>
              <button class="link-btn" @click="$router.push('/forms')">
                همه ←
              </button>
            </div>
            <div v-if="!forms.length" class="empty-sm">فرمی ساخته نشده</div>
            <div v-else class="rows">
              <div
                v-for="f in forms.slice(0, 5)"
                :key="f.id"
                class="row-item"
                @click="$router.push(`/forms/${f.id}/submissions`)"
              >
                <span class="row-ava row-ava--form"
                  ><i class="fas fa-file-alt"></i
                ></span>
                <span class="row-txt"
                  ><b>{{ f.title || "بدون عنوان" }}</b
                  ><small>{{ faNum(f.fields?.length || 0) }} فیلد</small></span
                >
                <i class="fas fa-chevron-left row-arrow"></i>
              </div>
            </div>
          </div>
        </section>

        <!-- MANAGER -->
        <template v-if="isGroupManager && !isAdmin">
          <section class="db-card card">
            <div class="db-card-head">
              <h3><i class="fas fa-layer-group"></i> گروه‌های من</h3>
              <button
                class="btn btn-primary btn-xs"
                @click="$router.push('/groups')"
              >
                <i class="fas fa-plus"></i> گروه جدید
              </button>
            </div>
            <div v-if="groups.length === 0" class="empty-box">
              <i class="fas fa-users"></i>
              <p>هنوز گروهی نساخته‌اید</p>
            </div>
            <div v-else class="rows">
              <div
                v-for="g in groups"
                :key="g.id"
                class="row-item"
                @click="$router.push('/groups')"
              >
                <span class="row-ava"><i class="fas fa-users"></i></span>
                <span class="row-txt"
                  ><b>{{ g.name }}</b
                  ><small>{{ g.description || "—" }}</small></span
                >
                <span class="pill"
                  >{{ faNum(g.Users?.length ?? g.member_count ?? 0) }} عضو</span
                >
              </div>
            </div>
          </section>
          <section class="db-card card">
            <div class="db-card-head">
              <h3><i class="fas fa-file-alt"></i> فرم‌های من</h3>
              <button
                class="btn btn-primary btn-xs"
                @click="$router.push('/forms/new')"
              >
                <i class="fas fa-plus"></i> فرم جدید
              </button>
            </div>
            <div v-if="forms.length === 0" class="empty-box">
              <i class="fas fa-file-alt"></i>
              <p>هنوز فرمی نساخته‌اید</p>
            </div>
            <div v-else class="rows">
              <div
                v-for="f in forms.slice(0, 6)"
                :key="f.id"
                class="row-item"
                @click="$router.push(`/forms/${f.id}/preview`)"
              >
                <span class="row-ava row-ava--form"
                  ><i class="fas fa-file-alt"></i
                ></span>
                <span class="row-txt"
                  ><b>{{ f.title || "بدون عنوان" }}</b
                  ><small>{{ faNum(f.fields?.length || 0) }} فیلد</small></span
                >
                <i class="fas fa-chevron-left row-arrow"></i>
              </div>
            </div>
          </section>
        </template>

        <!-- USER -->
        <template v-if="!isAdmin && !isGroupManager">
          <section class="db-card card accent-card">
            <div class="db-card-head">
              <h3><i class="fas fa-pen-square"></i> فرم‌های نیازمند پاسخ</h3>
              <button class="link-btn" @click="$router.push('/forms')">
                همه ←
              </button>
            </div>
            <div v-if="forms.length === 0" class="empty-box">
              <i class="fas fa-inbox"></i>
              <p>فرمی برای شما ثبت نشده است</p>
            </div>
            <div v-else class="rows">
              <div
                v-for="f in forms.slice(0, 6)"
                :key="f.id"
                class="row-item row-item--cta"
                @click="$router.push('/f/' + f.id)"
              >
                <span class="row-ava row-ava--form"
                  ><i class="fas fa-file-signature"></i
                ></span>
                <span class="row-txt"
                  ><b>{{ f.title || "بدون عنوان" }}</b
                  ><small>برای ثبت پاسخ کلیک کنید</small></span
                >
                <span class="cta-btn"
                  >پاسخ <i class="fas fa-arrow-left"></i
                ></span>
              </div>
            </div>
          </section>
          <section class="db-card card">
            <div class="db-card-head">
              <h3><i class="fas fa-user-edit"></i> ویرایش اطلاعات</h3>
            </div>
            <div class="profile-form profile-form--grid">
              <div class="form-row">
                <label>نام</label
                ><input v-model="profileForm.name" class="input" />
              </div>
              <div class="form-row">
                <label>تلفن</label
                ><input v-model="profileForm.phone" class="input" dir="ltr" />
              </div>
              <div class="form-row">
                <label>کد ملی</label
                ><input v-model="profileForm.code" class="input" dir="ltr" />
              </div>
              <div class="form-row">
                <label>رمز عبور جدید</label
                ><input
                  v-model="profileForm.password"
                  type="password"
                  class="input"
                  placeholder="اختیاری"
                />
              </div>
              <button
                class="btn btn-primary btn-sm profile-save"
                @click="updateProfile"
                :disabled="saving"
              >
                {{ saving ? "در حال ذخیره..." : "ذخیره تغییرات" }}
              </button>
            </div>
          </section>
          <section class="db-card card">
            <div class="db-card-head">
              <h3><i class="fas fa-users"></i> گروه‌های من</h3>
              <span class="pill">{{ faNum(groups.length) }} گروه</span>
            </div>
            <div v-if="groups.length === 0" class="empty-sm">
              عضو گروهی نیستید
            </div>
            <div v-else class="group-chips">
              <div v-for="g in groups" :key="g.id" class="group-chip">
                <span class="row-ava xs"><i class="fas fa-users"></i></span
                ><b>{{ g.name }}</b>
              </div>
            </div>
          </section>
        </template>
      </div>

      <!-- SIDE -->
      <aside class="db-side">
        <section class="db-card card wallet-card">
          <div class="db-card-head">
            <h3><i class="fas fa-wallet"></i> کیف پول</h3>
          </div>
          <div class="wallet-big">
            <span class="wallet-value" dir="ltr">{{
              formatMoney(walletBalance)
            }}</span
            ><span class="wallet-unit">ریال</span>
          </div>
          <div class="charge-row">
            <input
              v-model.number="chargeAmount"
              type="number"
              class="input"
              dir="ltr"
              min="1000"
              step="1000"
            />
            <button
              class="btn btn-primary btn-sm"
              :disabled="walletLoading"
              @click="requestCharge"
            >
              <i class="fas fa-plus"></i> شارژ
            </button>
          </div>
        </section>

        <section class="db-card card">
          <div class="db-card-head">
            <h3><i class="fas fa-cloud-sun"></i> آب‌وهوا</h3>
          </div>
          <div v-if="weatherError" class="empty-sm">{{ weatherError }}</div>
          <div v-else-if="!weather" class="empty-sm">در حال دریافت...</div>
          <div v-else class="weather-flex">
            <span class="weather-temp" dir="ltr"
              >{{ faNum(weather.temp) }}°</span
            >
            <div>
              <div class="weather-desc">{{ weather.desc }}</div>
              <div class="weather-meta">
                <span
                  >↑<b dir="ltr">{{ faNum(weather.tmax) }}°</b> ↓<b dir="ltr"
                    >{{ faNum(weather.tmin) }}°</b
                  ></span
                ><span
                  ><i class="fas fa-wind"></i>
                  <b dir="ltr">{{ weather.wind }}</b></span
                >
              </div>
            </div>
          </div>
        </section>

        <section class="db-card card">
          <div class="db-card-head">
            <h3><i class="fas fa-calendar-alt"></i> {{ jTodayFull }}</h3>
          </div>
          <div class="cal-wrap">
            <div class="cal-header">
              <button class="mini-nav" @click="calShift(-1)">
                <i class="fas fa-chevron-right"></i>
              </button>
              <span class="cal-title">{{ calTitle }}</span>
              <button class="mini-nav" @click="calShift(1)">
                <i class="fas fa-chevron-left"></i>
              </button>
            </div>
            <div class="cal-grid">
              <div v-for="d in calWeek" :key="d" class="cal-cell cal-week">
                {{ d }}
              </div>
              <div
                v-for="(c, i) in calCells"
                :key="i"
                class="cal-cell"
                :class="{ 'cal-other': c.other, 'cal-today': c.today }"
              >
                {{ c.day }}
              </div>
            </div>
          </div>
        </section>
      </aside>
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
            "Bearer " +
            (authStore.token || localStorage.getItem("token") || ""),
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
          if (Array.isArray(g.Users) || Array.isArray(g.users))
            return {
              ...g,
              Users: g.Users ?? g.users,
              member_count: (g.Users ?? g.users).length,
            };
          try {
            const r = await axios.get(SERVER + `/api/groups/${g.id}/users/`);
            const users = r.data?.data ?? r.data;
            return {
              ...g,
              Users: Array.isArray(users) ? users : [],
              member_count: Array.isArray(users) ? users.length : 0,
            };
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
      const userList = usersRes
        ? Array.isArray(usersRes.data?.data || usersRes.data)
          ? usersRes.data?.data || usersRes.data
          : []
        : [];
      const roleList = rolesRes
        ? Array.isArray(rolesRes.data?.data || rolesRes.data)
          ? rolesRes.data?.data || rolesRes.data
          : []
        : [];
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
const jToday = computed(() =>
  faNum(moment().locale("fa").format("jD jMMMM jYYYY")),
);
const jTodayFull = computed(() =>
  faNum(moment().locale("fa").format("jD jMMMM jYYYY")),
);
const calWeek = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const calYear = ref(moment().jYear());
const calMonth = ref(moment().jMonth());
const calCells = ref([]);
const calTitle = computed(() =>
  faNum(
    moment(`${calYear.value}/${calMonth.value + 1}/1`, "jYYYY/jM/jD")
      .locale("fa")
      .format("jMMMM jYYYY"),
  ),
);

function jalahliMonthDays(year, month0based) {
  if (month0based <= 5) return 31;
  if (month0based <= 10) return 30;
  return moment.jIsLeapYear(year) ? 30 : 29;
}

function buildCalendar() {
  const first = moment(
    `${calYear.value}/${calMonth.value + 1}/1`,
    "jYYYY/jM/jD",
  );
  const daysInMonth = jalahliMonthDays(calYear.value, calMonth.value);
  const startWeekday = (first.day() + 1) % 7;
  const today = moment();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) {
    const prev = moment(first).subtract(startWeekday - i, "days");
    cells.push({ day: faNum(prev.jDate()), other: true, today: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const c = moment(
      `${calYear.value}/${calMonth.value + 1}/${d}`,
      "jYYYY/jM/jD",
    );
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
    if (calMonth.value < 0) {
      calMonth.value = 11;
      calYear.value -= 1;
    }
  } else {
    calMonth.value += 1;
    if (calMonth.value > 11) {
      calMonth.value = 0;
      calYear.value += 1;
    }
  }
  buildCalendar();
}

// ---- وضعیت آب‌وهوا (open-meteo) ----
const weather = ref(null);
const weatherError = ref("");
const DEFAULT_COORDS = { lat: 35.6892, lng: 51.389 };

async function loadWeather() {
  try {
    let lat = DEFAULT_COORDS.lat;
    let lng = DEFAULT_COORDS.lng;
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 4000,
          }),
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
.db-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
/* HERO */
.hero {
  position: relative;
  overflow: hidden;
  padding: 22px !important;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  background:
    linear-gradient(
      135deg,
      rgba(232, 132, 60, 0.14),
      rgba(232, 132, 60, 0.03) 45%,
      transparent
    ),
    linear-gradient(180deg, var(--surface), var(--bg-elevated)) !important;
}
.hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(
      circle at 12% 20%,
      rgba(232, 132, 60, 0.18),
      transparent 32%
    ),
    radial-gradient(
      circle at 88% 90%,
      rgba(94, 163, 255, 0.12),
      transparent 30%
    );
}
.hero-main {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.avatar {
  width: 52px;
  height: 52px;
  border-radius: 17px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #d9732b, var(--accent-soft));
  box-shadow:
    0 6px 18px var(--accent-glow-strong),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}
.avatar.lg {
  width: 46px;
  height: 46px;
  font-size: 19px;
  border-radius: 15px;
}
.hero-eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.hero-date {
  font-size: 11.5px;
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--surface2);
  border: 1px solid var(--border);
  padding: 3px 10px;
  border-radius: 999px;
}
.hero-title {
  font-size: 21px;
  font-weight: 800;
  line-height: 1.4;
}
.hero-sub {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 3px;
}
.hero-sub b {
  color: var(--text);
}
.hero-actions {
  position: relative;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
/* STATS */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.stat-card {
  position: relative;
  overflow: hidden;
  padding: 16px !important;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stat-bar {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 3px;
}
.stat-bar--accent {
  background: linear-gradient(to left, var(--accent), transparent);
}
.stat-bar--success {
  background: linear-gradient(to left, var(--success), transparent);
}
.stat-bar--info {
  background: linear-gradient(to left, var(--info), transparent);
}
.stat-bar--warning {
  background: linear-gradient(to left, var(--warning), transparent);
}
.stat-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}
.stat-icon--accent {
  background: var(--accent-glow);
  color: var(--accent-soft);
}
.stat-icon--success {
  background: var(--success-glow);
  color: var(--success);
}
.stat-icon--info {
  background: var(--info-glow);
  color: var(--info);
}
.stat-icon--warning {
  background: var(--warning-glow);
  color: var(--warning);
}
.stat-go {
  font-size: 11px;
  color: var(--text-faint);
  opacity: 0;
  transition: all 0.2s;
}
.stat-card:hover .stat-go {
  opacity: 1;
  transform: translateX(3px);
}
.stat-value {
  font-size: 24px;
  font-weight: 800;
  line-height: 1.2;
}
.stat-value--sm {
  font-size: 15px;
}
.stat-label {
  font-size: 12px;
  color: var(--text-muted);
}
.stat-unit {
  font-size: 10px;
  color: var(--text-faint);
  background: var(--surface2);
  border: 1px solid var(--border);
  padding: 2px 8px;
  border-radius: 999px;
}
/* GRID */
.db-grid {
  display: grid;
  grid-template-columns: 1fr 330px;
  gap: 16px;
  align-items: start;
}
.db-main,
.db-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.db-card {
  padding: 18px !important;
}
.db-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  gap: 8px;
}
.db-card-head h3 {
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}
.db-card-head h3 i {
  color: var(--accent-soft);
  font-size: 13px;
}
.link-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--accent-soft);
  font-family: var(--font);
  font-size: 12px;
  font-weight: 700;
}
.link-btn:hover {
  text-decoration: underline;
}
.accent-card {
  border-color: rgba(232, 132, 60, 0.3) !important;
}
/* quick */
.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.quick {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 13px;
  padding: 15px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}
.quick:hover {
  transform: translateY(-2px);
  border-color: var(--accent-dim);
  background: var(--accent-glow);
  box-shadow: var(--shadow-md);
}
.quick b {
  font-size: 12.5px;
}
.quick small {
  font-size: 10.5px;
  color: var(--text-faint);
}
.quick-ic {
  width: 40px;
  height: 40px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  margin-bottom: 3px;
}
.quick-ic--accent {
  background: var(--accent-glow);
  color: var(--accent-soft);
}
.quick-ic--success {
  background: var(--success-glow);
  color: var(--success);
}
.quick-ic--info {
  background: var(--info-glow);
  color: var(--info);
}
.quick-ic--warning {
  background: var(--warning-glow);
  color: var(--warning);
}
.quick-ic--map {
  background: rgba(62, 207, 142, 0.12);
  color: var(--success);
}
.quick-ic--muted {
  background: rgba(154, 161, 192, 0.12);
  color: var(--text-muted);
}
.db-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
/* rows */
.rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.row-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 11px;
  border-radius: 11px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.13s;
}
.row-item:hover {
  background: var(--surface2);
  border-color: var(--border);
}
.row-item--cta:hover {
  border-color: var(--accent-dim);
  background: var(--accent-glow);
}
.row-ava {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-glow);
  color: var(--accent-soft);
  font-size: 14px;
}
.row-ava.xs {
  width: 28px;
  height: 28px;
  font-size: 11px;
  border-radius: 9px;
}
.row-ava--form {
  background: var(--info-glow);
  color: var(--info);
}
.row-txt {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.row-txt b {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row-txt small {
  font-size: 11px;
  color: var(--text-faint);
}
.row-arrow {
  font-size: 11px;
  color: var(--text-faint);
}
.pill {
  font-size: 11px;
  font-weight: 700;
  background: var(--surface3);
  border: 1px solid var(--border);
  color: var(--text-muted);
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
}
.cta-btn {
  font-size: 11.5px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #d9732b, var(--accent-soft));
  padding: 6px 13px;
  border-radius: 9px;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.empty-sm {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  padding: 16px 0;
}
.empty-box {
  text-align: center;
  padding: 26px 10px;
  color: var(--text-faint);
}
.empty-box i {
  font-size: 26px;
  margin-bottom: 8px;
  display: block;
  opacity: 0.5;
}
.empty-box p {
  font-size: 12.5px;
}
.group-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.group-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 5px 12px 5px 6px;
  font-size: 12px;
}
/* profile form */
.profile-form--grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.profile-form--grid .profile-save {
  grid-column: 1 / -1;
}
.form-row label {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 4px;
}
/* side */
.profile-mini .pm-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.profile-mini .pm-top b {
  font-size: 13.5px;
  display: block;
}
.profile-mini .pm-top small {
  font-size: 11px;
  color: var(--text-muted);
}
.profile-mini .pm-top .badge {
  margin-right: auto;
}
.pm-rows {
  display: flex;
  flex-direction: column;
}
.pm-rows > div {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 9px 2px;
  border-top: 1px solid var(--border);
  font-size: 12px;
}
.pm-rows span {
  color: var(--text-faint);
}
.pm-rows b {
  font-weight: 700;
}
.wallet-card {
  background:
    linear-gradient(135deg, rgba(232, 132, 60, 0.12), transparent 55%),
    linear-gradient(180deg, var(--surface), var(--bg-elevated)) !important;
}
.wallet-big {
  display: flex;
  align-items: baseline;
  gap: 7px;
  margin-bottom: 12px;
}
.wallet-value {
  font-size: 26px;
  font-weight: 800;
  color: var(--accent-soft);
}
.wallet-unit {
  font-size: 11px;
  color: var(--text-muted);
}
.charge-row {
  display: flex;
  gap: 8px;
}
.charge-row .input {
  flex: 1;
  min-height: 36px !important;
}
.charge-row .btn {
  flex-shrink: 0;
}
.weather-flex {
  display: flex;
  align-items: center;
  gap: 12px;
}
.weather-temp {
  font-size: 34px;
  font-weight: 800;
  color: var(--accent-soft);
  line-height: 1;
}
.weather-desc {
  font-size: 12px;
  color: var(--text-muted);
}
.weather-meta {
  display: flex;
  gap: 10px;
  font-size: 11.5px;
  color: var(--text-muted);
  margin-top: 4px;
}
.cal-wrap {
  margin-top: 2px;
}
.cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.cal-title {
  font-weight: 700;
  font-size: 13px;
}
.mini-nav {
  width: 28px;
  height: 28px;
  border-radius: 9px;
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}
.mini-nav:hover {
  color: var(--text);
  border-color: var(--border-strong);
}
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}
.cal-cell {
  text-align: center;
  padding: 5px 0;
  border-radius: 7px;
  font-size: 12px;
}
.cal-week {
  color: var(--text-faint);
  font-weight: 700;
  font-size: 10.5px;
}
.cal-other {
  opacity: 0.3;
}
.cal-today {
  background: linear-gradient(135deg, #d9732b, var(--accent-soft));
  color: #fff;
  font-weight: 800;
  box-shadow: 0 3px 10px var(--accent-glow-strong);
}
@media (max-width: 1024px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .db-grid {
    grid-template-columns: 1fr;
  }
  .db-cols {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .hero {
    padding: 18px !important;
  }
  .hero-title {
    font-size: 18px;
  }
  .quick-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .profile-form--grid {
    grid-template-columns: 1fr;
  }
  .stat-value {
    font-size: 20px;
  }
}
</style>
