<template xmlns="http://www.w3.org/1999/html">
  <div class="flex h-[calc(100vh-60px)] bg-gray-50">

    <div class="flex-1 h-full overflow-hidden">

      <div class="relative">

        <!-- ✅ آیکن فقط در موبایل -->
        <button class="absolute top-4 right-[5px] h-8 w-8 z-50 bg-black/30 text-white rounded md:hidden py-1.5" @click="isOpen = !isOpen">
          ☰
        </button>

      </div>

      <!-- Workspaces and Layers -->
      <!-- class="relative float-right h-screen"-->
      <div :class="['md:relative md:float-right md:h-screen md:block',           // در دسکتاپ همیشه نمایش داده شود
            isOpen ? 'fixed inset-0 z-[500] md:static' : 'hidden']">

        <!-- overlay فقط در موبایل -->
        <div v-if="isOpen" class="absolute inset-0 bg-black/40 md:hidden" @click="isOpen = false"></div>

        <!-- پنل اصلی (میز کار و ...) -->
        <div class="absolute top-1 right-[1px] w-[340px] max-w-[calc(100vw-16px)] bg-white border border-[var(--border)] rounded shadow p-3 z-[500] flex flex-col
                    md:h-[70vh]
                    max-md:top-2 max-md:bottom-2 max-md:left-2 max-md:right-2 max-md:w-auto max-md:max-h-[calc(100vh-16px)] max-md:overflow-y-auto">
          <button @click="isOpen = false" class="absolute top-2 left-4 text-xl z-10">&times;</button>
          <PinsList  v-if="viewer" class="flex-1 min-h-0" :pins="Pins" :viewer="viewer"  :openId ="openWorkId" :openDia="openMyDialog"
                     @clearPins="clearPins" :close="isOpen"/>

          <!-- بخش لایه های سرور فقط در موبایل داخل همین پنل -->
          <div class="md:hidden mt-3 pt-3 border-t border-gray-200">
            <h3 class="mb-2 text-sm">لایه های سرور : </h3>
            <hr style="border-top: 1px solid #aaa; margin-bottom: 10px"/>
            <span v-if="authStore?.user?.phone == '09153333989' || authStore?.user?.phone == '09156620866'" class="text-xs text-gray-800 truncate" >
              <input type="checkbox" class="ml-2 accent-green-600" @change="ShowTile"/>
              <i class="text-blue-500"/>
              عکس هوایی طرقبه 1340
            </span>
          </div>
        </div>

        <!-- پنل لایه های سرور (فقط دسکتاپ) -->
        <div id="layer-panel"
             class="absolute top-[70.5%] right-1 w-[340px] h-[29%] bg-white border border-[var(--border)] rounded shadow p-3 z-50 max-md:hidden">
          <div class=" overflow-y-auto h-[95%]">
              <h3 class="mb-2 text-sm">لایه های سرور : </h3>
              <hr style="border-top: 1px solid #aaa; margin-bottom: 10px"/>

            <span v-if="authStore?.user?.phone == '09153333989' || authStore?.user?.phone == '09156620866'" class="text-xs text-gray-800 truncate" >
              <input type="checkbox" class="ml-2 accent-green-600" @change="ShowTile"/>
              <i class="text-blue-500"/>
              عکس هوایی طرقبه 1340
            </span>
          </div>
        </div>

      </div>

      <!-- Cesium Map Container -->
      <div class="relative h-full">
        <div  id="cesiumWrapper" style="width:100%; height:100%;">

        <div id="cesiumContainer" style="width:100%; height:100%;">

          <div  v-if="!authStore.user && ShowForLogin" class="absolute h-8 bottom-3 right-1 md:right-[350px] bg-red-800/90 text-white px-4 rounded-md font-mono text-sm z-50" >
            <span> برای استفاده بهتر از امکانات سیستم  <a style="text-decoration: underline;" href="/login">ثبت نام</a> نمایید </span>
            <button @click="ShowForLogin = false" class="text-xl tp-2" >&times;</button>
          </div>


          <!-- Select Map Tiles -->
          <div class="absolute bottom-36 md:bottom-16 left-[8px] ml-1 z-50" >
            <button
                @click="expanded = !expanded"
                class="w-12 h-12 bg-gray-700 text-white rounded flex flex-col items-center justify-center shadow-md"
                title="نقشه پایه">
              <i class="fas fa-layer-group text-xl"></i>
              <span class="text-xs">نقشه</span>
            </button>

            <!-- show list of Map Tiles -->
            <div v-show="expanded"  @click.stop
                class="absolute md:top-0 md:left-full md:ml-2 bottom-full left-0 mb-2 w-[300px] max-w-[calc(100vw-24px)] md:w-max p-2 bg-white border border-gray-300 rounded shadow-md flex flex-col" >
              <div class="overflow-x-auto overflow-y-hidden md:overflow-visible flex gap-2 flex-nowrap">
                <div
                    v-for="map in maps"
                    :key="map.name"
                    @click="setBaseLayer(map)"
                    class="w-20 h-20 rounded border cursor-pointer overflow-hidden shadow hover:shadow-lg relative shrink-0"
                    :title="map.name">

                  <img :src="map.thumbnail" class="w-full h-full object-cover" />
                  <span  class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs text-center py-1" >
                    {{ map.name }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

          <!-- show detail bottom -->
          <div class="absolute bottom-8 md:bottom-3 left-3 px-2 py-2 rounded-md font-mono text-sm" style="background: rgba(26,29,39,.85); color: var(--text-muted);">
            <div class="float-left mr-4">
              <ToggleSwitch class="inline-block" v-model="latlon" left='UTM' right='GCS'/>
            </div>
            <div class="flex">
              <div v-if="latlon">
                Lon: {{ lon }} , Lat: {{ lat }} | Scale: {{ scale }}
              </div>
              <div v-else>
                Easting: {{ easting }} , Northing: {{ northing }} , Zone: {{ zone }} | Scale: {{ scale }}
              </div>
            </div>
          </div>
        </div>

        <!--<SearchCode  v-if="viewer" :viewer="viewer" />-->
        <AddFile  v-if="viewer" :viewer="viewer"  :pins="Pins" />
        <NorthArrow v-if="viewer" :viewer="viewer" />
        <FlyPosition v-if="viewer" :viewer="viewer" :latlon="latlon"/>
        <!--<DrawTools ref="drawing" v-if="viewer" :viewer="viewer"  :pins="Pins"  @disableFeatureInfo="featurePanel.deactivate"/>-->
        <DrawTools ref="drawing" v-if="viewer" :viewer="viewer"  :pins="Pins" @disableFeatureInfo="featurePanel?.disableEdit()" @pickPoint="onMapPointPicked"/>

        <DataView  v-if="openDataView" :workspace="workspaceView"  :layer="layerView"  :geoserverUrl= 'GEOSERVER + "/geoserver"' :pageSize="20">
          <template #close>
            <button @click="openDataView = false" class="text-gray-700 font-bold text-lg px-2 py-1 rounded hover:bg-gray-200">
              ✖
            </button>
          </template>
        </DataView>

        <FeatureInfoPanel ref="featurePanel" :viewer="viewer" :pins="Pins" :layersLoaded="layersLoaded"   @disableDrawing="() => drawing?.inactiveDrawing()"/>

      </div>

    </div>

  </div>

  <OpenDialog v-if="viewer" v-model:visible="openDialog" :openId="openWorkId" :pins="Pins"  @update:pins="Pins = $event" :viewer="viewer"/>
  <SearchAddress v-if="viewer" :viewer="viewer" />
  <Profile />
  <Loading :active="loading" />
  <button v-if="isMobileUA"
      @click="getLocation" style="z-index: 9999"
      class= 'absolute bottom-16 right-[10px] w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center shadow-md'
      title="جستجوی آدرس">
    <i class="fas fa-location m-1"></i>
  </button>


  <!-- منوی راست کلیک -->
  <div v-if="contextMenu.visible"  class="absolute bg-white border rounded shadow-lg py-2 z-50 text-xs px-2 "
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }" >
    <span class=" block border-b-2 border-gray-400 font-bold mt-1 pb-2 px-2"> ترتیب نمایش لایه ها در نقشه</span>
    <button class="block px-4 py-1 w-full hover:bg-gray-100 text-right border-b border-gray-200 mt-2"
             @click="changeOrder(contextMenu.item,'lower');">
      یک لایه به پایین
    </button>
    <button class="block px-4 py-1 w-full hover:bg-gray-100 text-right border-b border-gray-200"
            @click="changeOrder(contextMenu.item ,'raise');">
      یک لایه به بالا
    </button>
    <button class="block px-4 py-1 w-full hover:bg-gray-100 text-right border-b border-gray-200"
            @click="changeOrder(contextMenu.item,'raiseToTop');">
      بعنوان بالاترین لایه
    </button>
    <button class="block px-4 py-1 w-full hover:bg-gray-100 text-right"
            @click="changeOrder(contextMenu.item,'lowerToBottom');">
      بعنوان پایین ترین لایه
    </button>
  </div>

  <!-- پنل انتخاب نقطه و پاسخ به فرم‌ها (از پایین) -->
  <LocationPickerPanel
      v-model:visible="showPickerPanel"
      :lat="pickedPoint.lat"
      :lng="pickedPoint.lng"
      @close="closePickerPanel"
  />

</template>

<script setup>

//lucide-vue-next
import {ref, reactive, onMounted, computed, inject, onActivated, onDeactivated, provide} from 'vue'
import AddFile from '../components/AddFile.vue'
import SearchCode from '../components/SearchCode.vue'

import NorthArrow from '../components/NorthIcon.vue';
import FlyPosition from '../components/FlyPosition.vue';
import DrawTools from '../components/DrawTools.vue';
import FeatureInfoPanel from '../components/FeatureInfoPanel.vue';
import DataView from '../components/DataView.vue';
import ItemBox from '../components/ItemBox.vue';
import Loading from '../components/Loading.vue'
import PinsList from "../components/PinsList.vue";
import OpenDialog from '../components/OpenDialog.vue'
import ShowFlag from '../components/ShowFlag.vue'
import SearchAddress from '../components/SearchAddress.vue'
import Profile from '../components/Profile.vue'
import ToggleSwitch from "../components/ToggleSwitch.vue"
import LocationPickerPanel from "../components/LocationPickerPanel.vue"

import shp from 'shpjs'
import {useRouter} from 'vue-router';
import {useAuthStore} from '../stores/auth';
import axios from "axios";
import proj4 from "proj4";

//#region  -- Variable
const maps = [
  {
    name: "OSM",
    thumbnail: "https://a.tile.openstreetmap.org/0/0/0.png",
    provider: new Cesium.UrlTemplateImageryProvider({
      url: "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
    }),
  },
  {
    name: "Satellite",
    thumbnail: "smap.jpg", // placeholder
    provider: new Cesium.UrlTemplateImageryProvider({
      url: "https://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}",
    }),
  },
  {
    name: "Google Maps(داخلی)",
    thumbnail: "gmap.jpg", // placeholder
    provider: new Cesium.UrlTemplateImageryProvider({
      url: "https://mapiq.ir:3002/api/proxy/mapir/google/vt/lyrs=p&hl=fa&x={x}&y={y}&z={z}", // Road / Normal Map
    }),
  },
  {
    name: "Satellite(داخلی)",
    thumbnail: "smap.jpg", // placeholder
    provider: new Cesium.UrlTemplateImageryProvider({
      url: "https://sat.neshanmap.ir/v1.0/{z}/{x}/{y}", // Satellite layer
    }),
  },

];
const expanded = ref(false);

const router = useRouter();
const authStore = useAuthStore();
const isMobileUA = ref(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))


const ShowForLogin = ref(true)
const isOpen = ref(false)
const visibleLayers = ref([])
const showLayerPanel = ref(false)
let showFolder = ref(false)
let activeTab = ref("layers")
let activeTab1 = ref("my")

const files = ref([])
let showDialog = ref(false)
let viewer = null
let tileset = null

let map;
let fileLayer;
const layers = ref([]);
const selectedLayer = ref(null);
const layersLoaded = reactive([]);
const activeLayer = ref(null);
let wmsLayer;

const loadedFiles = ref([]);
const draws = ref([]);
const inboxFiles = ref([]);
const outboxFiles = ref([]);
const Pins = reactive([]);
const openWorkId = ref({});
const openDialog = ref(false)

const entities = [];
const users = ref([]);
const workspaces = ref([]);
const selectedWorkspace = ref('');
const selectedLayers = ref([]);
let measure = null;

const openDataView = ref(false);
const workspaceView = ref('');
const layerView = ref('');

let latlon = ref(false)
const easting = ref("--");
const northing = ref("--");
const lon = ref("--");
const lat = ref("--");
const zone = ref("--");
const height = ref("--");
const scale = ref("--");
const selectedFeature = ref(null);

const featurePanel = ref(null);
const drawing = ref(null);
const loading = ref(false)

// ── Map point picker (دکمه نقطه در DrawTools)
const pickMarker = ref(null)
const pickedPoint = reactive({ lat: null, lng: null })
const showPickerPanel = ref(false)
const drawDataSource= new Cesium.CustomDataSource("file");
//#endregion

const GEOSERVER = import.meta.env.VITE_GEOSERVER //?? 'http://localhost:8080';
const SERVER = import.meta.env.VITE_SERVER //?? 'http://localhost:3001';

const code = ref('')
let showTile;
//const contextOpacity = ref(false);

provide('Pins', Pins)
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  item: null
})

function clearPins() {
  Pins.splice(0, Pins.length);
}

function openMyDialog() {
  openDialog.value = true;
}

function showContextMenu(event, item) {
  contextMenu.value.visible = true
  contextMenu.value.x = event.pageX
  contextMenu.value.y = event.pageY
  contextMenu.value.item = item
}

function changeOrder(layer , tab) {

  const index = layersLoaded.findIndex(l => l.name === layer)
  if (index > -1) {
    let ly = layersLoaded[index].layer;

    switch (tab) {
      case 'lower':
        viewer.imageryLayers.lower(ly);
        break;
      case 'raise':
        viewer.imageryLayers.raise(ly);
        break;
      case 'raiseToTop':
        viewer.imageryLayers.raiseToTop(ly);
        break;
      case 'lowerToBottom':
        viewer.imageryLayers.lowerToBottom(ly);
        break;
    }
  }
  hideContextMenu();
}

function hideContextMenu() {
  contextMenu.value.visible = false
}

function layerInList(layer) {
  const index = layersLoaded.findIndex(l => l.name === layer && l.active)
  if (index > -1)  return true
  else return false;
}

const activeOpacityLayer = ref(null);
const layerRefs = reactive({});
const layerOpacity = reactive({});

const toggleOpacitySlider = (layer) => {
  activeOpacityLayer.value = activeOpacityLayer.value === layer ? null : layer;
};

const updateLayerOpacity = (layer) => {
  //const imageryLayer = layerRefs[layer];
  const index = layersLoaded.findIndex(l => l.name === layer)
  const imageryLayer = layersLoaded[index].layer;
  if (imageryLayer) imageryLayer.alpha = layerOpacity[layer];
};

const hideOpacitySlider = (event) => {
  const isInsideSlider = event.target.closest(".opacity-slider-container");
  if (!isInsideSlider)
    activeOpacityLayer.value = null;
};

onMounted(() => {
  window.addEventListener('click', (event) => {
    hideContextMenu(event);
    hideOpacitySlider(event);
  });

  initMap_Cesium();
  //loadUsers();
  //loadFiles();
  //loadInbox();
  //loadOutbox();
  //fetchLayers()
  //fetchFiles()

  setTimeout(() => {
    const logo = document.querySelector(".cesium-credit-logoContainer");
    const _text = document.querySelector(".cesium-credit-textContainer");
    if (logo) {
      logo.style.display = "none";
    }
    if (_text) {
      _text.style.display = "none";
    }

  }, 100);

});

onActivated(async  () => {
  //await loadUsers();
  //await fetchFiles()
});

const getLayersForSelectedWorkspace = computed(() => {
  const ws = workspaces.value.find(w => w.name === selectedWorkspace.value);
  return ws ? ws.layers : [];
});

const initMap_Cesium = async () => {

  // Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3ZTA1ZDA4MC0xYTQ3LTQ2NzQtYTNiZi1jZDc4M2NmODE0NDUiLCJpZCI6MzI1ODA4LCJpYXQiOjE3NTM2MzE3Nzl9.51x5_pHSxsRast5qyeGS_JP49S_scRzmnPMN-VLbY-s";
  // const terrainProvider = await Cesium.createWorldTerrainAsync({
  //   requestWaterMask: true,
  //   requestVertexNormals: true
  // });

  // ================================= set layer for topo map base with GeoServer
  // const terrainProvider = new Cesium.CesiumTerrainProvider({
  //   url: "URL_TO_YOUR_TERRAIN_DATA" //  GeoServer Layer
  // });

  //https://map.ir/google/vt/lyrs=p&hl=fa&x=43686&y=25577&z=16

  const terrainProvider =
      await Cesium.CesiumTerrainProvider.fromUrl(
          "https://mapiq.ir:8050/terrain"
      );

      viewer = new Cesium.Viewer("cesiumContainer", {
        baseLayer: await Cesium.ImageryLayer.fromProviderAsync(
            new Cesium.UrlTemplateImageryProvider({
              url: "https://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}",
              // credit: "© OpenStreetMap contributors",
              // tilingScheme: new Cesium.WebMercatorTilingScheme(),
              // maximumLevel: 19,
              // tileWidth: 256,
              // tileHeight: 256,
            })
        ),
        //terrain: Cesium.Terrain.fromWorldTerrain(),
        baseLayerPicker: false,
        animation: false,
        timeline: false,
        geocoder: false,         // حذف آیکن جستجو
        homeButton: false,        // می‌توانید true یا false کنید
        sceneModePicker: false,   // 2d/3d
        navigationHelpButton: false,
        selectionIndicator: false,
        infoBox : false,
        terrainProvider: terrainProvider
      });


  const controller = viewer.scene.screenSpaceCameraController;
  controller.maximumZoomDistance = 2600000;
  Cesium.ImageryProvider.retryLoad = false;
  Cesium.Resource.maximumConcurrentRequests = 8;

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
        51.5,
        35.5,
        50000
    )
  });

  viewer.zoomTo(viewer.terrainProvider);

  // Set Handler for Move Mouse for show Poisiton
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction((movement) => {
    const cartesian = viewer.camera.pickEllipsoid(
        movement.endPosition,
        viewer.scene.globe.ellipsoid
    );

    if (cartesian) {
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const lonDeg = Cesium.Math.toDegrees(cartographic.longitude);
      const latDeg = Cesium.Math.toDegrees(cartographic.latitude);
      const h = (cartographic.height || 0).toFixed(2);

      // همیشه GCS رو ذخیره می‌کنیم
      lon.value = lonDeg.toFixed(6);
      lat.value = latDeg.toFixed(6);

      // محاسبه UTM
      const { _zone, hemisphere } = getUTMZone(latDeg, lonDeg);
      const utmProj = `+proj=utm +zone=${_zone} +datum=WGS84 +units=m +no_defs ${
          hemisphere === "S" ? "+south" : ""
      }`;

      const [_easting, _northing] = proj4("WGS84", utmProj, [lonDeg, latDeg]);

      easting.value = _easting.toFixed(2);
      northing.value = _northing.toFixed(2);
      zone.value = _zone + hemisphere;
      height.value = h;
      scale.value = getScale();
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

  // Set Handler for Click Mouse for show Identity
  // const handler2 = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  // handler2.setInputAction((click) => {
  //   //pickFeature(click.position);
  //   const picked = viewer.scene.pick(click.position);
  //
  //   if (Cesium.defined(picked) && picked.id) {
  //     showFeatureInfo(picked.id);
  //   }
  //
  // }, Cesium.ScreenSpaceEventType.LEFT_CLICK);


  // Set Handler for DOUBLE Click Mouse for Disable
  viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  //viewer.scene.screenSpaceCameraController.disableZooming = false;
  //viewer.scene.screenSpaceCameraController.enableRotate = false; // جلوگیری از چرخش در 2D
  //viewer.scene.screenSpaceCameraController.enableTilt = false;  // جلوگیری از شیب

// محدود کردن محدوده دید (در صورت نیاز)
  viewer.scene.preRender.addEventListener(() => {
    const rectangle = viewer.camera.computeViewRectangle();
    if (rectangle) {
      // اعمال محدودیت‌های دلخواه برای عرض جغرافیایی
      const maxLatitude = Cesium.Math.toRadians(85);
      if (rectangle.north > maxLatitude) {
        // تنظیم مجدد دوربین
      }
    }
  });

  viewer.scene.postRender.addEventListener(() => {
    scale.value = getScale();
  });

  // Set Home icon to position
  // viewer.homeButton.viewModel.command.beforeExecute.addEventListener(function (commandInfo) {
  //   commandInfo.cancel = true; // جلوگیری از عملکرد پیش‌فرض
  //
  //   // پرواز به نقطه دلخواه
  //   viewer.camera.flyTo({
  //     destination: Cesium.Cartesian3.fromDegrees(59.37660, 36.31202, 5000)
  //     //destination: Cesium.Cartesian3.fromDegrees(50.49707, 35.30545, 5000),
  //   });
  // });

}

const ShowTile = () => {

    if (showTile) {
      showTile.show = !showTile.show;
    } else {

      const imageryProvider = new Cesium.UrlTemplateImageryProvider({
        url: 'tile/data/Ax_1340/{z}/{x}/{y}.png',
        credit: 'Local MBTiles'
      });
      showTile = viewer.imageryLayers.addImageryProvider(imageryProvider);
    }

}

const setBaseLayer = (map) => {
  if (!viewer) return;

  const baseLayerCollection = viewer.imageryLayers;
  if (baseLayerCollection.length > 0) {
    baseLayerCollection.remove(baseLayerCollection.get(0), true);
  }

  viewer.imageryLayers.addImageryProvider(map.provider, 0);
  expanded.value = false;
}

const show3D = async (file) => {

  try {
    tileset = await Cesium.Cesium3DTileset.fromUrl(SERVER + "/Data/" + file);
    tileset.maximumScreenSpaceError = 1;
    tileset.maximumMemoryUsage = 512;
    viewer.scene.primitives.add(tileset);

    await tileset.readyPromise;

    const oldCenter = Cesium.Cartesian3.clone(tileset.boundingSphere.center);
    const carto = Cesium.Cartographic.fromCartesian(oldCenter);
    const newHeight = 0;
    const newCenter = Cesium.Cartesian3.fromRadians( carto.longitude, carto.latitude, newHeight);
    const translationVec = Cesium.Cartesian3.subtract( newCenter, oldCenter, new Cesium.Cartesian3() );
    const translationMatrix = Cesium.Matrix4.fromTranslation(translationVec);
    tileset.modelMatrix = Cesium.Matrix4.multiply(
        translationMatrix,
        tileset.modelMatrix,
        new Cesium.Matrix4()
    );

    await viewer.zoomTo(tileset);
  } catch (error) {
    console.error(`Error creating tileset: ${error}`);
  }

}

const loadUsers = async () => {
  try {
    const response = await axios.get(SERVER + '/api/users3');
    users.value = response.data;
    workspaces.value = users.value.find(a => a.id == authStore.user.id).workspaces
  } catch (error) {
    console.error('Error loading users:', error);
  }
};

const loadFiles = async () => {
  try {
    const response = await axios.get(SERVER + '/api/myFiles/' + authStore.user.id);
    draws.value = response.data;
  } catch (error) {
    console.error('Error loading users:', error);
  }
};

const loadInbox = async () => {
  try {
    const response = await axios.get(SERVER + '/api/inbox/' + authStore.user.id);
    inboxFiles.value = response.data;
  } catch (error) {
    console.error('Error loading users:', error);
  }
};

const loadOutbox = async () => {
  try {
    const response = await axios.get(SERVER + '/api/outbox/' + authStore.user.id);
    outboxFiles.value = response.data;
  } catch (error) {
    console.error('Error loading users:', error);
  }
};

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};

const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  const fileName = file.name.toLowerCase()
  let DataSource;
  loading.value = true;

  // فایل KML
  if (fileName.endsWith(".kml")) {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const kmlText = e.target.result
      const blob = new Blob([kmlText], {
        type: "application/vnd.google-earth.kml+xml",
      })
      const url = URL.createObjectURL(blob)

      try {
        DataSource = await Cesium.KmlDataSource.load(url, {
          camera: viewer.scene.camera,
          canvas: viewer.scene.canvas,
        })
        await viewer.dataSources.add(DataSource)
        await viewer.flyTo(DataSource).then(() => {
          loading.value = false;
          let savedCameraView = {
            position: viewer.camera.position.clone(),
            heading: viewer.camera.heading,
            pitch: viewer.camera.pitch,
            roll: viewer.camera.roll
          };
          let row = {
            name: fileName,
            bounding: savedCameraView,
            dataSource : DataSource
          }
          loadedFiles.value.push(row);

          let pin = {
            id : 'file' ,
            name : fileName,
            shape : DataSource,
            date :  new Date(),
            bounding: savedCameraView,
          }
          Pins.push(pin);

        });

      } catch (error) {
        console.error("خطا در بارگذاری KML:", error)
        loading.value = false;
      }
    }
    reader.readAsText(file)
  }

  // فایل ZIP شامل SHP
  else if (fileName.endsWith(".zip")) {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result
        const geojson = await shp(arrayBuffer)
        DataSource = await Cesium.GeoJsonDataSource.load(geojson)
        await viewer.dataSources.add(DataSource)
        await viewer.flyTo(DataSource).then(() => {
          loading.value = false;
          let savedCameraView = {
            position: viewer.camera.position.clone(),
            heading: viewer.camera.heading,
            pitch: viewer.camera.pitch,
            roll: viewer.camera.roll
          };
          let row = {
            name: fileName,
            bounding: savedCameraView,
            dataSource : DataSource
          }
          loadedFiles.value.push(row);
          let pin = {
            id : 'file' ,
            name : fileName,
            shape : DataSource,
            date :  new Date(),
            bounding: savedCameraView,
          }
          Pins.push(pin);

        });

      } catch (error) {
        console.error("خطا در بارگذاری Shapefile:", error)
        loading.value = false;
      }
    }
    reader.readAsArrayBuffer(file)
  } else {
    alert("فقط فایل‌های KML یا SHP (ZIP) پشتیبانی می‌شوند.")
    loading.value = false;
  }

}

const uploadToGeoserver = async () => {
  if (!selectedFile.value) return

  const formData = new FormData()
  formData.append("file", selectedFile.value)

  try {
    const response = await fetch(SERVER + `/api/upload/${type}`, {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (response.ok)
      alert("فایل با موفقیت به سرور ارسال شد.")
  } catch (err) {
    console.error(err)
    alert("ارسال فایل به GeoServer با خطا مواجه شد.")
  }
};

const fetchLayers = async () => {
  const res = await axios.get(SERVER + '/api/layers');
  layers.value = res.data;
};

const addLayerToMap = async () => {
  if (wmsLayer) map.removeLayer(wmsLayer);

  wmsLayer = L.tileLayer.wms(GEOSERVER + "/geoserver/wms", {
    layers: selectedLayer.value,
    format: "image/png",
    noWrap: true,
    transparent: true
  });
  wmsLayer.addTo(map);
  //zoomToLayer(selectedLayer.value,map);
};

function setActiveLayer(layer) {
  if (visibleLayers.value.includes(layer))
    activeLayer.value = layer;
}

const toggleLayer =async (layerName, work_id) => {
  if (!viewer) return;
  if (activeLayer.value == null) activeLayer.value=layerName;
  if (work_id == '3d') {
    selectFile(layerName)
  }
  let datastore = 'congress'; // در گرفتن Bounding Box استفاده می شود
  //let workspace =selectedWorkspace.value;
  let workspace = workspaces.value.find(a => a.id == work_id);
  // 1️⃣ اضافه کردن لایه WMS
  const lyr = `${workspace.name}:${layerName}`;
  if (visibleLayers.value.includes(layerName)) {

    const index = layersLoaded.findIndex(l => l.name === layerName)
    if (index > -1) {
      let ly = layersLoaded[index].layer;
      ly.show = true;
      layersLoaded[index].active = true;
    } else {

      if (workspace.mbtile == 'tile') {
        const  imageryProvider= new Cesium.UrlTemplateImageryProvider({
          url: `${GEOSERVER}/geoserver/gwc/service/wmts?layer=${workspace.name}:${layerName}&tilematrixset=EPSG:4326&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/png&TileMatrix=EPSG:4326:{z}&TileCol={x}&TileRow={y}`,
          credit: 'Local MBTiles'
        });
        let layer = viewer.imageryLayers.addImageryProvider(imageryProvider);

        layerRefs[layer] = layer;
        layerOpacity[layerName] = 1.0; // مقدار اولیه شفافیت
        //layer.alpha= 0.5;
        layersLoaded.push({name: layerName, layer: layer, work: workspace.name, active: true})

      } else {
        const imageryProvider = new Cesium.WebMapServiceImageryProvider({
          url: GEOSERVER + '/geoserver/gwc/service/wms', //wms
          layers: lyr,
          parameters: {
            service: "WMS",
            format: "image/png",
            transparent: true,
            srs: "EPSG:4326"
          }
        });

        // const imageryProvider = new Cesium.WebMapTileServiceImageryProvider({
        //   url:  GEOSERVER + '/geoserver/gwc/service/wmts', //wms
        //   layer: lyr,
        //   style: '',
        //   format: 'image/png',
        //   tileMatrixSetID: 'EPSG:4326',
        //   maximumLevel: 21
        // });

        let layer = viewer.imageryLayers.addImageryProvider(imageryProvider);

        layerRefs[layer] = layer;
        layerOpacity[layerName] = 1.0; // مقدار اولیه شفافیت
        //layer.alpha= 0.5;
        layersLoaded.push({name: layerName, layer: layer, work: workspace.name, active: true})
      }
    }
    /*
    // 2️⃣ گرفتن Bounding Box از GeoServer
    try {
      const url = SERVER + `/api/proxy?path=rest/workspaces/${workspace.name}/datastores/${datastore}/featuretypes/${layerName}.json`;
      //const url = `http://localhost:3001/proxy?path=geoserver/rest/workspaces/${workspace.name}/datastores/${datastore}/featuretypes/${layerName}.json`;

      const res = await fetch(url,
          {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }

          });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const bbox = data.featureType?.latLonBoundingBox;
      if (bbox) {
        // 3️⃣ پرواز به محدوده لایه
        const rectangle = Cesium.Rectangle.fromDegrees(
            bbox.minx,
            bbox.miny,
            bbox.maxx,
            bbox.maxy
        );
        viewer.camera.flyTo({destination: rectangle});
      } else {
        console.warn("Bounding box not found for layer:", layerName);
      }
    } catch (err) {
      console.error("Error fetching bounding box:", err);
    }
  */
  } else {
    if (layerName) {
      const index = layersLoaded.findIndex(l => l.name === layerName)
      let ly = layersLoaded[index].layer;
      ly.show = false;
      layersLoaded[index].active = false;
      if (activeLayer.value == layerName) {
        if (visibleLayers[index - 1])
          activeLayer.value=visibleLayers[index - 1].name;
        else
          activeLayer.value = null;
      }
      //layersLoaded.splice(index, 1);
      // if (index !== -1) {
      //   viewer.imageryLayers.remove(layersLoaded[index].layer, true)
      //   layersLoaded.splice(index, 1)
      // }
    }
  }

}

const showDateView = (work , layerName) => {
  workspaceView.value = work;
  layerView.value = layerName;
  openDataView.value=true;
};

const zoomFile = (file) => {
  let tmp = loadedFiles.value.find(a=> a.name == file);
  let b = tmp.bounding;
  viewer.camera.flyTo({
    destination: b.position,
    orientation: {
      heading: b.heading,
      pitch: b.pitch,
      roll: b.roll
    },
    duration: 1.5 // Optional: Duration of the flight in seconds
  });

};

async function fetchFiles() {
  try {
    const res = await fetch(SERVER + '/api/files')
    files.value = await res.json()
    if (files.value.length > 0) {
      let work = {
        id : '3d',
        name : 'لایه های سه بعدی',
        layers : Array.from(files.value)
      }
      workspaces.value.push(work);
    }
  } catch (e) {
    console.error('Error fetching files:', e)
  }
}

function selectFile(filename) {
  //showDialog.value = false

  if (tileset) {
    if (tileset.show == true)
      tileset.show = false;
    else
      tileset.show = true;
    //viewer.scene.primitives.remove(tileset)
  } else {
    show3D(filename);
  }
}

function getUTMZone(latDeg, lonDeg) {
  const _zone = Math.floor((lonDeg + 180) / 6) + 1;
  const hemisphere = latDeg >= 0 ? "N" : "S";
  return { _zone, hemisphere };
}

function getScale() {
  const scene = viewer.scene;
  const canvas = scene.canvas;

  // دو نقطه روی صفحه (مرکز و 100px سمت راست)
  const center = new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
  const right = new Cesium.Cartesian2(center.x + 100, center.y);

  const pickCenter = viewer.camera.pickEllipsoid(center, scene.globe.ellipsoid);
  const pickRight = viewer.camera.pickEllipsoid(right, scene.globe.ellipsoid);

  if (pickCenter && pickRight) {
    const c1 = Cesium.Cartographic.fromCartesian(pickCenter);
    const c2 = Cesium.Cartographic.fromCartesian(pickRight);
    const geodesic = new Cesium.EllipsoidGeodesic(c1, c2);
    const distance = geodesic.surfaceDistance; // فاصله زمینی (متر)

    // محاسبه مقیاس (1 : N)
    const metersPerPixel = 0.00028; // 0.28 mm (استاندارد OGC)
    const scale = distance / (100 * metersPerPixel);
    return "1:" + Math.round(scale).toLocaleString();
  }
  return "--";
}

function replaceKeys(dataObj, mapping) {
  const result = {};

  for (const key in dataObj) {
    if (mapping[key]) {  // فقط اگر معادل وجود داشت
      result[mapping[key]] = dataObj[key];
    }
  }

  return result;
}

function translate(word) {
  return  dict[word] || dict[word.toLowerCase()] || word;
}

// ── Map point picker (دکمه نقطه در DrawTools) ──────────
function onMapPointPicked({ lat, lng }) {
  if (!viewer) return

  pickedPoint.lat = lat
  pickedPoint.lng = lng

  if (pickMarker.value) viewer.entities.remove(pickMarker.value)
  pickMarker.value = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lng, lat),
    point: {
      pixelSize: 12,
      color: Cesium.Color.fromCssColorString('#e8843c'),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 3,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
    }
  })

  viewer.flyTo(pickMarker.value, { offset: new Cesium.HeadingPitchRange(0, -45, 800) })

  // باز کردن پنل فرم‌ها از پایین
  showPickerPanel.value = true
}

function closePickerPanel() {
  showPickerPanel.value = false
  if (pickMarker.value) {
    viewer.entities.remove(pickMarker.value)
    pickMarker.value = null
  }
  pickedPoint.lat = null
  pickedPoint.lng = null
}

const chunkSize = 5000;
const maxParallelRequests = 2;
let customDataSource=[];
const is3DActive = ref(false)
async function show3D_Layer() {
  is3DActive.value = !is3DActive.value
  if (is3DActive.value) {
    if (customDataSource.length > 0) {
      for (let i=0; i < customDataSource.length ; i++)
        customDataSource[i].show = true;
    } else {
      const totalFeatures = 20000;
      loading.value = true;
      await loadAllChunks(totalFeatures);
    }
  } else {
    if (customDataSource)  {
      for (let i=0; i < customDataSource.length ; i++)
        customDataSource[i].show = false;
    }

  }
}

function loadWfsChunk(start) {
  const url =
      GEOSERVER + `/geoserver/wfs?service=WFS&version=1.0.0&request=GetFeature` +
      `&typeName=Amlak:اعیان` +
      `&outputFormat=application/json` +
      `&srsName=EPSG:4326` +
      `&startIndex=${start}` +
      `&maxFeatures=${chunkSize}`;

  return Cesium.GeoJsonDataSource.load(url).then(dataSource => {
    viewer.dataSources.add(dataSource);
    customDataSource.push(dataSource) ;
    const entities = dataSource.entities.values;

    // گرفتن مختصات رأس‌ها
    // const positions =
    //     e.polygon.hierarchy.getValue(Cesium.JulianDate.now()).positions;

    // نمونه‌گیری ارتفاع واقعی از terrain
    // const updatedPositions =await Cesium.sampleTerrainMostDetailed(
    //     viewer.terrainProvider,
    //     positions
    // );
    loading.value = false;
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      const tmp = parseFloat(e.properties.h.getValue());
      let height =tmp ;
      let color = Cesium.Color.BLUE.withAlpha(0.6);
      if (tmp < 3) {
        color = Cesium.Color.GRAY.withAlpha(0.6);
      }
      if (tmp > 3) {
        color = Cesium.Color.GREEN.withAlpha(0.6);
      }
      if (tmp > 6)  {
        color = Cesium.Color.BLUE.withAlpha(0.6);
      }
      if (tmp > 9)  {
        color = Cesium.Color.RED.withAlpha(0.6);
      }
      if (tmp > 12) {
        color = Cesium.Color.AQUA.withAlpha(0.6);
      }

      if (e.polygon) {
        // e.polygon.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
        // e.polygon.extrudedHeightReference = Cesium.HeightReference.RELATIVE_TO_GROUND;

        // e.polygon.hierarchy = new Cesium.PolygonHierarchy(updatedPositions);
        // e.polygon.height = 0; // یا مقدار Z از داده

        e.polygon.extrudedHeight = height;
        e.polygon.material = color;
        e.polygon.outlineColor = Cesium.Color.GRAY;
        e.polygon.outline = true;
        //console.log("i :" , i);
      }
    }

    console.log(`Chunk starting at ${start} loaded (${entities.length} features)`);
    return entities.length;
  });
}

// ===== Load Chunks parallel
async function loadAllChunks(totalCount) {
  let startIndices = [];
  for (let start = 0; start < totalCount; start += chunkSize) {
    startIndices.push(start);
  }

  let activeRequests = 0;
  let promises = [];

  for (let i = 0; i < startIndices.length; i++) {
    promises.push(loadWfsChunk(startIndices[i]));
    activeRequests++;

    if (activeRequests >= maxParallelRequests) {
      await Promise.all(promises);
      promises = [];
      activeRequests = 0;
    }
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }

  console.log("تمام داده‌ها لود شدند ✅");
}

function getLocation() {
  if (navigator.geolocation) {
    // درخواست دریافت موقعیت
    navigator.geolocation.getCurrentPosition(
        (position) => {
          // موفقیت: موقعیت کاربر دریافت شد
          console.log("عرض جغرافیایی: " + position.coords.latitude);
          console.log("طول جغرافیایی: " + position.coords.longitude);
          try {

            const height = position.coords.altitude ?? 0;

            // 1) تبدیل مختصات به Cartesian برای Cesium
            const userCart = Cesium.Cartesian3.fromDegrees(position.coords.longitude, position.coords.latitude, height);

            // 2) اگر قبلاً نقطه کاربر را اضافه کرده‌ای، آپدیتش کن؛ اگر نه، بساز
            const id = "user-location";

            // حذف قبلی (اختیاری)
            const old = viewer.entities.getById(id);
            if (old) viewer.entities.remove(old);

            // 3) اضافه کردن نقطه
            const entity = viewer.entities.add({
              id,
              position: userCart,
              point: {
                pixelSize: 10,
                color: Cesium.Color.BLUE,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND, // بچسب به زمین
              },
            });

          } catch (err) {
            alert (err)
          }

          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(position.coords.longitude, position.coords.latitude, 500),
          });

        },
        (error) => {
          // خطا یا رد دسترسی
          switch(error.code) {
            case error.PERMISSION_DENIED:
              alert("دسترسی به موقعیت مکانی رد شد.");
              break;
            case error.POSITION_UNAVAILABLE:
              alert("اطلاعات موقعیت مکانی در دسترس نیست (ممکن است GPS خاموش باشد).");
              break;
            case error.TIMEOUT:
              alert("زمان درخواست دریافت موقعیت تمام شد.");
              break;
          }
        }
    );
  } else {
    alert("مرورگر شما از قابلیت موقعیت مکانی پشتیبانی نمی‌کند.");
  }
}


</script>

<style scoped>

#map {
  /*height: 775px;*/
  height: 90vh;
}

#layer-panel {
  /*position: absolute;*/
  /*top: 70px;*/
  right: 1px;
  z-index: 10;
  /*height: 88%;*/
}

#cesiumContainer {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}


</style>
