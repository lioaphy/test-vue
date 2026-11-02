<template>
  <el-select
    :value="value"
    @change="handleSelectChange"
    v-bind="$attrs"
    class="el-dialog-select"
    :multiple="multiple"
  >
    <template #trigger>
      <el-button
        class="trigger-button"
        @click="popoverVisible = !popoverVisible"
      >...</el-button>
    </template>
    
    <el-popover
      v-model="popoverVisible"
      placement="bottom"
      trigger="manual"
      :popper-class="['dialog-select-popover', $attrs.popperClass]"
    >
      <el-table
        ref="table"
        :data="tableData"
        @selection-change="handleSelectionChange"
        @current-change="handleCurrentChange"
        :highlight-current-row="!multiple"
        style="width: 100%"
      >
        <el-table-column
          v-if="multiple"
          type="selection"
          width="55"
        ></el-table-column>
        <el-table-column
          v-else
          type="index"
          width="55"
        ></el-table-column>
        <slot name="columns"></slot>
      </el-table>

      <div class="dialog-footer">
        <el-button size="mini" @click="popoverVisible = false">取消</el-button>
        <el-button type="primary" size="mini" @click="confirmSelection">确定</el-button>
      </div>
    </el-popover>
  </el-select>
</template>

<script>
export default {
  name: 'ElDialogSelect',
  props: {
    value: [Array, String, Number],
    multiple: {
      type: Boolean,
      default: false
    },
    tableData: {
      type: Array,
      default: () => []
    },
    keyField: {
      type: String,
      default: 'id'
    }
  },
  data() {
    return {
      popoverVisible: false,
      selectedRows: []
    }
  },
  watch: {
    value: {
      immediate: true,
      handler(newVal) {
        this.updateSelectedRows(newVal)
        this.$nextTick(this.updateTableSelection)
      }
    },
    tableData() {
      this.$nextTick(this.updateTableSelection)
    }
  },
  methods: {
    updateSelectedRows(value) {
      const values = Array.isArray(value) ? value : [value]
      this.selectedRows = this.tableData.filter(row => 
        values.includes(row[this.keyField])
      )
    },
    updateTableSelection() {
      if (!this.$refs.table) return
      
      this.$refs.table.clearSelection()
      this.selectedRows.forEach(row => {
        this.$refs.table.toggleRowSelection(row, true)
      })
      
      if (!this.multiple && this.selectedRows.length) {
        this.$refs.table.setCurrentRow(this.selectedRows[0])
      }
    },
    handleSelectionChange(selection) {
      if (this.multiple) {
        this.selectedRows = selection
      }
    },
    handleCurrentChange(currentRow) {
      if (!this.multiple) {
        this.selectedRows = currentRow ? [currentRow] : []
      }
    },
    confirmSelection() {
      const selectedKeys = this.selectedRows.map(row => row[this.keyField])
      const newValue = this.multiple ? selectedKeys : selectedKeys[0] || ''
      this.$emit('input', newValue)
      this.popoverVisible = false
    },
    handleSelectChange(value) {
      this.$emit('change', value)
    }
  }
}
</script>

<style scoped>
.el-dialog-select ::v-deep .el-select__caret {
  display: none;
}

.trigger-button {
  padding: 8px 12px;
  font-size: 14px;
}

.dialog-footer {
  margin-top: 10px;
  text-align: right;
}
</style>

<style>
.dialog-select-popover {
  min-width: 400px;
  padding: 15px;
}
</style>