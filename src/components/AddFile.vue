<template>
  <!--<div class="absolute top-[4px] left-[66px] z-50 flex items-center">
    <label
        class="bg-[var(--primary-color)] border border-gray-300 rounded-lg px-2 py-1 shadow hover:bg-blue-400 transition text-white mr-1">
        <img src="../assets/icons/add_layer.svg" class="w-6 h-6" />
        <input type="file" class="hidden" @change="e => handleFileUpload(e, 'shapefile')"  accept=".kml,.zip"/>
    </label>
  </div>-->

<Loading :active="loading" />
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Loading from './Loading.vue'

const loading = ref(false)

const props = defineProps({
  pins: { type: Object, required: true },
  viewer: { type: Object, required: true },
});


const handleFileUpload = async (event) => {
  const viewer= props.viewer
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
          //loadedFiles.value.push(row);

          let pin = {
            id : 'file' ,
            name : fileName,
            shape : DataSource,
            date :  new Date(),
            bounding: savedCameraView,
          }
          props.pins.push(pin);
          //this.$emit('add-pin', pin);

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
          props.pins.push(pin);
          //this.$emit('add-pin', pin);

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

</script> 