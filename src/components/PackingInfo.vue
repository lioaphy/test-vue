<template>
  <div class="packing-info">
    <div class="info-item">
      <span class="info-label">Packing NO</span>
      <span class="info-value">{{ info.zcpackno }}</span>
    </div>
    <div class="info-item">
      <span class="info-label">客户订单号</span>
      <span class="info-value">{{ info.bstkd }}</span>
    </div>
    <div class="info-item">
      <span class="info-label">客户名称</span>
      <span class="info-value">{{ info.customer }}</span>
    </div>
    <div class="info-item">
      <span class="info-label">联 系 人</span>
      <span class="info-value">{{ info.contact }}</span>
    </div>
    <div class="info-item">
      <span class="info-label">联系电话</span>
      <span class="info-value">{{ info.phone }}</span>
    </div>
    <div class="info-item">
      <span class="info-label">出货日期</span>
      <span class="info-value">{{ info.shipDate }}</span>
    </div>
    <div class="info-item">
      <span class="info-label">出 货 仓</span>
      <span class="info-value">{{ info.warehouse }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PackingInfo',
  props: {
    info: { type: Object, required: true }
  }
}
</script>

<style>
.a4-slot .packing-info {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px 24px;
  margin-bottom: 18px;
  font-size: 10.5pt;
}
.a4-slot .packing-info .info-item  { display: flex; gap: 8px; }
.a4-slot .packing-info .info-label {
  color: #646a73;
  min-width: 5.5em;
  flex-shrink: 0;
}
.a4-slot .packing-info .info-value { color: #1f2329; }
</style>