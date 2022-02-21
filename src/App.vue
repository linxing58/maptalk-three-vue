<template>
  <div id="app">
    <three/>
  </div>
</template>

<script>
import three from './components/three.vue'

export default {
  name: 'App',
  components: {
    three
  }
}
</script>

<style>
html,body,#app{
  height: 100%;
}
</style>
