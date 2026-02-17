<template>
  <div id="app" class="min-h-screen bg-gray-900 text-gray-100">
    <nav class="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div class="flex items-center justify-between max-w-7xl mx-auto">
        <div class="flex items-center space-x-8">
          <h1 class="text-2xl font-bold text-cyan-400">IoT Dashboard</h1>
          <router-link 
            to="/dashboard" 
            class="text-gray-300 hover:text-white transition"
          >
            Dashboard
          </router-link>
          <router-link 
            to="/devices" 
            class="text-gray-300 hover:text-white transition"
          >
            Devices
          </router-link>
          <router-link 
            to="/alerts" 
            class="text-gray-300 hover:text-white transition"
          >
            Alerts
          </router-link>
        </div>
        <div class="flex items-center space-x-4">
          <div 
            :class="isConnected ? 'bg-green-500' : 'bg-red-500'"
            class="w-2 h-2 rounded-full"
            :title="isConnected ? 'Connected' : 'Disconnected'"
          />
          <span class="text-sm text-gray-400">
            {{ deviceCount }} devices
          </span>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto px-6 py-8">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDeviceStore } from './stores/deviceStore';

const store = useDeviceStore();
const deviceCount = computed(() => store.deviceCount);
const isConnected = computed(() => true); // Replace with actual connection status
</script>
