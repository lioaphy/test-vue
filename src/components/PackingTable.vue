<template>
  <table class="doc-table packing-table">
    <thead>
      <tr>
        <th class="col-id">序号</th>
        <th class="col-pack">Packing NO</th>
        <th class="col-bstkd">客户订单号</th>
        <th class="col-kdmat">客户料号</th>
        <th class="col-matnr">内部料号</th>
        <th class="col-maktx">品名</th>
        <th class="col-lfimg text-right">数量</th>
        <th class="col-lotid">批号</th>
        <th class="col-qty text-right">件数</th>
        <th class="col-remark">备注</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(item, index) in list" :key="item.id">
        <td>{{ index + 1 }}</td>
        <td>{{ item.zcpackno }}</td>
        <td>{{ item.bstkd }}</td>
        <td>{{ item.kdmat }}</td>
        <td>{{ item.matnr }}</td>
        <td>{{ item.maktx }}</td>
        <td class="text-right">{{ item.lfimg }}</td>
        <td>{{ item.lotid }}</td>
        <td class="text-right">{{ item.quantity }}</td>
        <td>{{ item.zwaferid }}</td>
      </tr>
      <tr class="total-row">
        <td colspan="6">合计</td>
        <td class="text-right">{{ totalLfimg }}</td>
        <td></td>
        <td class="text-right">{{ totalQuantity }}</td>
        <td></td>
      </tr>
    </tbody>
  </table>
</template>

<script>
export default {
  name: 'PackingTable',
  props: {
    list: { type: Array, default: () => [] }
  },
  computed: {
    totalLfimg() {
      return this.list.reduce((sum, item) => sum + (Number(item.lfimg) || 0), 0)
    },
    totalQuantity() {
      return this.list.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
    }
  }
}
</script>

<style>
/* ============================================================
   装箱明细表样式（无边框 + 紧凑 + 左对齐为主）
   - 表头与内容默认左对齐
   - 数量 / 件数两列右对齐（表头也右对齐）
   - 无边框，用细线区分表头 / 行 / 合计
   ============================================================ */
.a4-slot .packing-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9pt;
  table-layout: fixed;
}

.a4-slot .packing-table th,
.a4-slot .packing-table td {
  border: 0;
  padding: 3px 6px;
  text-align: left;             /* ★ 默认左对齐 */
  vertical-align: middle;
  line-height: 1.35;
  word-break: break-all;
}

/* ---------- 表头 ---------- */
.a4-slot .packing-table thead th {
  background: #f5f7fa;
  font-weight: 600;
  /* 表头默认继承 td 的左对齐，不再单独设 center */
  border-bottom: 1px solid #b0b6bd;
  padding-top: 5px;
  padding-bottom: 5px;
}

/* ---------- 表身：行之间用细线分隔 ---------- */
.a4-slot .packing-table tbody tr + tr td {
  border-top: 1px solid #e8eaed;
}

/* 合计行：上方用稍粗的线强调 */
.a4-slot .packing-table .total-row td {
  font-weight: 600;
  background: #f0f2f5;
  border-top: 1px solid #b0b6bd;
}

/* ---------- 对齐控制 ---------- */
.a4-slot .packing-table .text-right {
  text-align: right !important;
}
.a4-slot .packing-table .text-center {
  text-align: center !important;
}

/* ---------- 列宽分配（10 列） ---------- */
.a4-slot .packing-table .col-id     { width: 6%; }
.a4-slot .packing-table .col-pack   { width: 13%; }
.a4-slot .packing-table .col-bstkd  { width: 11%; }
.a4-slot .packing-table .col-kdmat  { width: 10%; }
.a4-slot .packing-table .col-matnr  { width: 11%; }
.a4-slot .packing-table .col-maktx  { width: 15%; }
.a4-slot .packing-table .col-lfimg  { width: 7%; }
.a4-slot .packing-table .col-lotid  { width: 13%; }
.a4-slot .packing-table .col-qty    { width: 6%; }
.a4-slot .packing-table .col-remark { width: 8%; }

/* ---------- 打印时保留背景色 ---------- */
@media print {
  .a4-slot .packing-table thead th {
    background: #f5f7fa !important;
  }
  .a4-slot .packing-table .total-row td {
    background: #f0f2f5 !important;
  }
}
</style>