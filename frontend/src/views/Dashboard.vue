<template>
  <div>
    <div class="mb-8">
      <h2 class="text-3xl font-bold mb-2">Dashboard</h2>
      <p class="text-gray-400">Real-time device monitoring</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <StatCard 
        title="Total Devices" 
        :value="deviceCount" 
        color="cyan"
      />
      <StatCard 
        title="Online" 
        :value="onlineDevices.length" 
        color="green"
      />
      <StatCard 
        title="Offline" 
        :value="offlineDevices.length" 
        color="red"
      />
      <StatCard 
        title="Degraded" 
        :value="degradedDevices.length" 
        color="yellow"
      />
    </div>

    <div class="bg-gray-800 rounded-lg p-6">
      <h3 class="text-xl font-semibold mb-4">Devices</h3>
      <RecycleScroller
        class="h-96"
        :items="allDevices"
        :item-size="120"
        key-field="deviceId"
        v-slot="{ item }"
      >
        <DeviceCard :device-id="item.deviceId" />
      </RecycleScroller>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { RecycleScroller } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import { useDeviceStore } from '../stores/deviceStore';
import { useDeviceTelemetry } from '../composables/useDeviceTelemetry';
import DeviceCard from '../components/DeviceCard.vue';
import StatCard from '../components/StatCard.vue';

const store = useDeviceStore();

const allDevices = computed(() => store.allDevices);
const onlineDevices = computed(() => store.onlineDevices);
const offlineDevices = computed(() => store.offlineDevices);
const degradedDevices = computed(() => store.degradedDevices);
const deviceCount = computed(() => store.deviceCount);

// Subscribe to all devices for real-time updates
onMounted(() => {
  const deviceIds = allDevices.value.map(d => d.deviceId);
  useDeviceTelemetry(deviceIds);
});
</script>
