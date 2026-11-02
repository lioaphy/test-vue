<template>
  <div class="home-page">
    <div class="page-header">
      <h1>出货装箱单 · 控制台</h1>
      <p>切换下方 Tab 查看不同的导出方式。</p>
    </div>

    <div class="page-actions">
      <button class="primary-btn" @click="openDialog">打开发货单预览</button>
    </div>

    <Teleport to="body">
      <div v-if="dialogVisible" class="my-dialog-mask" @click.self="closeDialog">
        <div class="my-dialog">
          <header class="my-dialog-header">
            <h3>发货单预览</h3>
            <div class="header-actions">
              <!-- 模式切换 -->
              <div class="mode-tabs" role="tablist">
                <button
                  type="button"
                  class="tab-btn"
                  :class="{ active: mode === 'print' }"
                  @click="mode = 'print'"
                >
                  打印模式
                </button>
                <button
                  type="button"
                  class="tab-btn"
                  :class="{ active: mode === 'pdf' }"
                  @click="mode = 'pdf'"
                >
                  PDF 模式
                </button>
              </div>

              <!-- 方向切换 -->
              <div class="orient-switch">
                <button
                  type="button"
                  class="orient-btn"
                  :class="{ active: orientation === 'portrait' }"
                  @click="orientation = 'portrait'"
                >
                  纵向
                </button>
                <button
                  type="button"
                  class="orient-btn"
                  :class="{ active: orientation === 'landscape' }"
                  @click="orientation = 'landscape'"
                >
                  横向
                </button>
              </div>

              <button class="close-btn" @click="closeDialog">×</button>
            </div>
          </header>

          <div class="my-dialog-body">
            <!-- ★ 打印模式 ★ -->
            <A4PrintDocument
              v-if="mode === 'print'"
              :orientation="orientation"
              file-name="出货装箱单-ZCPK20260113"
              @before-print="onBeforePrint"
              @after-print="onAfterPrint"
              @error="onError"
            >
              <template #header>
                <div class="doc-brand">XX 电子科技有限公司</div>
                <h1 class="doc-title">出 货 装 箱 单</h1>
                <div class="doc-sub">
                  <span>Packing NO：{{ orderInfo.zcpackno }}</span>
                  <span>日期：{{ today }}</span>
                </div>
              </template>

              <template #footer>
                <div class="doc-footer">
                  <span>XX 电子科技有限公司</span>
                  <span>电话：0571-8888 8888 ｜ 地址：杭州市西湖区文三路 100 号</span>
                </div>
              </template>

              <!-- 正文 -->
              <PackingInfo :info="orderInfo" />

              <h2 class="section-title">装箱明细</h2>
              <PackingTable :list="details" />
            </A4PrintDocument>

            <!-- ★ PDF 模式 ★ -->
            <A4PdfDocument
              v-else
              :orientation="orientation"
              file-name="出货装箱单-ZCPK20260113"
              @before-print="onBeforePrint"
              @after-print="onAfterPrint"
              @error="onError"
            >
              <template #header>
                <div class="doc-brand">XX 电子科技有限公司</div>
                <h1 class="doc-title">出 货 装 箱 单</h1>
                <div class="doc-sub">
                  <span>Packing NO：{{ orderInfo.zcpackno }}</span>
                  <span>日期：{{ today }}</span>
                </div>
              </template>

              <template #footer>
                <div class="doc-footer">
                  <span>XX 电子科技有限公司</span>
                  <span>电话：0571-8888 8888 ｜ 地址：杭州市西湖区文三路 100 号</span>
                </div>
              </template>

              <!-- 正文 -->
              <PackingInfo :info="orderInfo" />

              <h2 class="section-title">装箱明细</h2>
              <PackingTable :list="details" />
            </A4PdfDocument>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import A4PrintDocument from './components/a4/A4PrintDocument.vue'
import A4PdfDocument from './components/a4/A4PdfDocument.vue'
import PackingInfo from './components/PackingInfo.vue'
import PackingTable from './components/PackingTable.vue'

/* ---------------- Dialog 控制 ---------------- */
const dialogVisible = ref(false)
const mode = ref('print')         // 'print' | 'pdf'
const orientation = ref('landscape')  // 10 列内容，默认横向更合适

function openDialog() { dialogVisible.value = true }
function closeDialog() { dialogVisible.value = false }

/* ---------------- 基础信息 ---------------- */
const today = new Date().toLocaleDateString('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit'
})

const orderInfo = {
  zcpackno: 'ZCPK20260113',
  bstkd: 'PO-2026-0088',
  customer: '深圳某某电子有限公司',
  contact: '李经理',
  phone: '138 0000 0000',
  shipDate: '2026-01-15',
  warehouse: '杭州一号仓',
  totalQty: 0
}

/* ---------------- 装箱明细 ---------------- */
const details = ref([
  {
    id: 1,
    zcpackno: 'ZCPK20260113',
    bstkd: 'PO-2026-0088',
    kdmat: 'KD-A1001',
    matnr: 'M-8801-A',
    maktx: '12寸晶圆载具 A 型',
    lfimg: 120,
    lotid: 'LOT20260101-A1',
    quantity: 4,
    zwaferid: '第一箱'
  },
  {
    id: 2,
    zcpackno: 'ZCPK20260113',
    bstkd: 'PO-2026-0088',
    kdmat: 'KD-A1002',
    matnr: 'M-8801-B',
    maktx: '12寸晶圆载具 B 型',
    lfimg: 100,
    lotid: 'LOT20260101-A2',
    quantity: 4,
    zwaferid: '第一箱'
  },
  {
    id: 3,
    zcpackno: 'ZCPK20260113',
    bstkd: 'PO-2026-0088',
    kdmat: 'KD-B2010',
    matnr: 'M-8802-A',
    maktx: '8寸晶圆载具 A 型',
    lfimg: 200,
    lotid: 'LOT20260102-B1',
    quantity: 5,
    zwaferid: '第二箱'
  },
  {
    id: 4,
    zcpackno: 'ZCPK20260113',
    bstkd: 'PO-2026-0088',
    kdmat: 'KD-B2011',
    matnr: 'M-8802-B',
    maktx: '8寸晶圆载具 B 型',
    lfimg: 160,
    lotid: 'LOT20260102-B2',
    quantity: 4,
    zwaferid: '第二箱'
  },
  {
    id: 5,
    zcpackno: 'ZCPK20260113',
    bstkd: 'PO-2026-0088',
    kdmat: 'KD-C3010',
    matnr: 'M-8803-A',
    maktx: '6寸晶圆载具 A 型',
    lfimg: 300,
    lotid: 'LOT20260103-C1',
    quantity: 6,
    zwaferid: '第三箱'
  },
  {
    id: 6,
    zcpackno: 'ZCPK20260113',
    bstkd: 'PO-2026-0088',
    kdmat: 'KD-C3011',
    matnr: 'M-8803-B',
    maktx: '6寸晶圆载具 B 型',
    lfimg: 240,
    lotid: 'LOT20260103-C2',
    quantity: 5,
    zwaferid: '第三箱'
  },
  {
    id: 7,
    zcpackno: 'ZCPK20260113',
    bstkd: 'PO-2026-0088',
    kdmat: 'KD-D4001',
    matnr: 'M-8804-A',
    maktx: '封装基板 A 型',
    lfimg: 500,
    lotid: 'LOT20260104-D1',
    quantity: 10,
    zwaferid: '第四箱'
  },
  {
    id: 8,
    zcpackno: 'ZCPK20260113',
    bstkd: 'PO-2026-0088',
    kdmat: 'KD-D4002',
    matnr: 'M-8804-B',
    maktx: '封装基板 B 型',
    lfimg: 480,
    lotid: 'LOT20260104-D2',
    quantity: 10,
    zwaferid: '第四箱'
  },
  {
    id: 9,
    zcpackno: 'ZCPK20260113',
    bstkd: 'PO-2026-0088',
    kdmat: 'KD-E5001',
    matnr: 'M-8805-A',
    maktx: '测试治具 A 型',
    lfimg: 60,
    lotid: 'LOT20260105-E1',
    quantity: 2,
    zwaferid: '第五箱'
  },
  {
    id: 10,
    zcpackno: 'ZCPK20260113',
    bstkd: 'PO-2026-0088',
    kdmat: 'KD-E5002',
    matnr: 'M-8805-B',
    maktx: '测试治具 B 型',
    lfimg: 60,
    lotid: 'LOT20260105-E2',
    quantity: 2,
    zwaferid: '第五箱'
  },
  {
    id: 11,
    zcpackno: 'ZCPK20260113',
    bstkd: 'PO-2026-0088',
    kdmat: 'KD-F6001',
    matnr: 'M-8806-A',
    maktx: '清洗夹具 A 型',
    lfimg: 80,
    lotid: 'LOT20260106-F1',
    quantity: 3,
    zwaferid: '第六箱'
  },
  {
    id: 12,
    zcpackno: 'ZCPK20260113',
    bstkd: 'PO-2026-0088',
    kdmat: 'KD-F6002',
    matnr: 'M-8806-B',
    maktx: '清洗夹具 B 型',
    lfimg: 80,
    lotid: 'LOT20260106-F2',
    quantity: 3,
    zwaferid: '第六箱'
  }
])

/* ---------------- 打印事件 ---------------- */
function onBeforePrint() { console.log('开始导出…') }
function onAfterPrint() { console.log('导出完成') }
function onError(err) {
  console.error('导出失败', err)
  alert('导出失败：' + (err?.message || '未知错误'))
}
</script>

<style>
/* 主页面样式 */
.home-page {
  min-height: 100vh;
  padding: 32px;
  background: #f5f7fa;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #1f2329;
}
.page-header h1 { margin: 0 0 8px; font-size: 22px; }
.page-header p  { margin: 0 0 24px; color: #646a73; }
.page-actions   { margin-bottom: 24px; }
.primary-btn {
  padding: 10px 22px;
  font-size: 14px;
  border: none;
  border-radius: 6px;
  background: #2b5cff;
  color: #fff;
  cursor: pointer;
}
.primary-btn:hover { background: #1e47d6; }

/* Dialog */
.my-dialog-mask {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: flex-start; justify-content: center;
  padding: 40px 16px; overflow: auto; z-index: 1000;
}
.my-dialog {
  background: #f5f7fa; border-radius: 10px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  max-width: min(1400px, 100%);
  max-height: calc(100vh - 80px);
  display: flex; flex-direction: column; overflow: hidden;
}
.my-dialog-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; padding: 12px 20px;
  border-bottom: 1px solid #e5e6eb; background: #fff;
}
.my-dialog-header h3 { margin: 0; font-size: 16px; }
.header-actions { display: flex; align-items: center; gap: 12px; }

.mode-tabs,
.orient-switch {
  display: inline-flex; padding: 2px;
  border-radius: 8px; background: #f2f3f5;
}
.tab-btn,
.orient-btn {
  padding: 5px 14px; font-size: 13px; font-family: inherit;
  border: none; border-radius: 6px; background: transparent;
  color: #646a73; cursor: pointer;
}
.tab-btn.active,
.orient-btn.active {
  background: #fff; color: #2b5cff; font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.close-btn {
  width: 32px; height: 32px; font-size: 22px; line-height: 1;
  border: none; background: transparent; cursor: pointer;
  color: #646a73; border-radius: 6px;
}
.close-btn:hover { background: #f2f3f5; }
.my-dialog-body { padding: 20px; overflow: auto; }

/* ============================================================
   插槽内容样式：统一 .a4-slot 前缀
   ============================================================ */
.a4-slot .doc-brand {
  font-size: 10pt; letter-spacing: 2px; color: #646a73;
}
.a4-slot .doc-title {
  margin: 4px 0 8px; font-size: 20pt; font-weight: 600;
  text-align: center; letter-spacing: 4px;
}
.a4-slot .doc-sub {
  display: flex; justify-content: space-between;
  font-size: 10pt; color: #646a73;
}
.a4-slot .doc-footer {
  display: flex; justify-content: space-between; gap: 16px;
}

.a4-slot .section-title {
  font-size: 13pt; font-weight: 600; margin: 20px 0 10px;
  padding-left: 10px; border-left: 4px solid #2b5cff;
}
</style>