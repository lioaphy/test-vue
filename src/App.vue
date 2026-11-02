<template>
  <div id="app">
    <el-dialog-select
    v-model="selectedValue"
    :table-data="tableData"
    :multiple="true"
    key-field="id"
    placeholder="请选择"
    >
      <template #columns>
        <el-table-column prop="name" label="姓名"></el-table-column>
        <el-table-column prop="age" label="年龄"></el-table-column>
        <el-table-column prop="gender" label="性别"></el-table-column>
      </template>
    </el-dialog-select>

    <img alt="Vue logo" src="./assets/logo.png">
    <HelloWorld msg="Welcome to Your Vue.js App"/>
    <Home/>
  </div>
</template>

<script>
import HelloWorld from './components/HelloWorld.vue'
import ElDialogSelect from './components/ElDialogSelect.vue';
import Home from './HomeView.vue';

export default {
  name: 'App',
  components: {
    HelloWorld,
    ElDialogSelect,
    Home
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
