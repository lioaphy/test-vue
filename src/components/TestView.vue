<template>
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
</template>

<script>
export default {
  data() {
    return {
      selectedValue: [],
      tableData: [
        { id: 1, name: '张三', age: 25, gender: '男' },
        { id: 2, name: '李四', age: 30, gender: '女' },
        { id: 3, name: '王五', age: 28, gender: '男' }
      ]
    }
  }
}
</script>