<template>
  <router-view />
</template>

<script setup>
</script>

<style>
/* 避免 App 内强依赖 Google Fonts（国内网络易超时拖垮 WebView） */
@font-face {
  font-family: 'Noto Serif SC';
  src: local('Noto Serif SC'), local('Source Han Serif SC'), local('Songti SC'), local('SimSun');
  font-display: swap;
}
@font-face {
  font-family: 'Noto Sans SC';
  src: local('Noto Sans SC'), local('Source Han Sans SC'), local('PingFang SC'), local('Microsoft YaHei');
  font-display: swap;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  min-height: 100vh;
}

body {
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

a {
  color: inherit;
}
</style>
