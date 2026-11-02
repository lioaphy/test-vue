<!-- ============================================================
     Home.vue
     演示：A4PrintDocument 放在 Dialog 中，支持纵向 / 横向切换
     ============================================================ -->
<template>
  <div class="home-page">
    <div class="page-header">
      <h1>某某科技 · 控制台</h1>
      <p>未打开 Dialog 时按 Ctrl/Cmd + P 会打印整页。</p>
    </div>

    <div class="page-actions">
      <button class="primary-btn" @click="openDialog">打开报价单预览</button>
    </div>

    <div class="page-body">
      <p>（此处省略若干主页面业务内容……）</p>
    </div>

    <Teleport to="body">
      <div
        v-if="dialogVisible"
        class="my-dialog-mask"
        @click.self="closeDialog"
      >
        <div class="my-dialog" role="dialog" aria-modal="true">
          <header class="my-dialog-header">
            <h3>报价单预览</h3>

            <div class="header-actions">
              <!-- 纸张方向切换 -->
              <div class="orient-switch" role="group" aria-label="纸张方向">
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

              <button class="close-btn" @click="closeDialog" aria-label="关闭">
                ×
              </button>
            </div>
          </header>

          <div class="my-dialog-body">
            <!-- ★ A4PrintDocument ★ -->
            <A4PrintDocument
              ref="docRef"
              :orientation="orientation"
              file-name="报价单-QT20260112-008"
              @before-print="onBeforePrint"
              @after-print="onAfterPrint"
              @error="onError"
            >
              <!-- 页眉 / 页脚 / 正文与上一版完全一致，略 -->
              <template #header>
                <div class="doc-brand">某某科技 · XX TECHNOLOGY</div>
                <h1 class="doc-title">项目报价明细单</h1>
                <div class="doc-sub">
                  <span>报价单号：{{ orderNo }}</span>
                  <span>报价日期：{{ today }}</span>
                </div>
              </template>

              <template #footer>
                <div class="doc-footer">
                  <span>杭州某某科技有限公司</span>
                  <span>电话：0571-8888 8888 ｜ 地址：文三路 100 号</span>
                </div>
              </template>

              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">客户名称</span>
                  <span>{{ customer.name }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">联 系 人</span>
                  <span>{{ customer.contact }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">联系电话</span>
                  <span>{{ customer.phone }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">项目周期</span>
                  <span>{{ customer.period }}</span>
                </div>
              </div>

              <h2 class="section-title">一、费用明细</h2>

              <table class="doc-table">
                <thead>
                  <tr>
                    <th style="width: 8%">序号</th>
                    <th style="width: 28%">项目名称</th>
                    <th style="width: 30%">规格说明</th>
                    <th style="width: 8%" class="text-right">数量</th>
                    <th style="width: 13%" class="text-right">单价</th>
                    <th style="width: 13%" class="text-right">金额</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in details" :key="item.id">
                    <td class="text-center">{{ index + 1 }}</td>
                    <td>{{ item.name }}</td>
                    <td>{{ item.spec }}</td>
                    <td class="text-right">{{ item.qty }}</td>
                    <td class="text-right">{{ formatMoney(item.price) }}</td>
                    <td class="text-right">{{ formatMoney(item.amount) }}</td>
                  </tr>
                  <tr class="total-row">
                    <td colspan="5" class="text-right">合计金额（含税）</td>
                    <td class="text-right">{{ formatMoney(total) }}</td>
                  </tr>
                </tbody>
              </table>

              <h2 class="section-title">二、备注说明</h2>
              <div class="doc-note">
                <p>1. 以上报价含增值税专用发票，税率为 6%。</p>
                <p>2. 付款方式：合同签订后 50%，验收后 50%。</p>
                <p>3. 本报价有效期 30 天。</p>
                <p>4. 页面超出 A4 一页时，页眉页脚会自动在每一页重复。</p>
                <p>5. 下载的 PDF 与打印输出一致，支持纵向 / 横向。</p>
              </div>
            </A4PrintDocument>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import A4PrintDocument from './A4PrintDocument.vue'

const dialogVisible = ref(false)
const docRef = ref(null)
const orientation = ref('portrait')

const orderNo = 'QT-20260112-008'
const today = new Date().toLocaleDateString('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit'
})

const customer = {
  name: '杭州某某科技有限公司',
  contact: '张先生',
  phone: '138 0000 0000',
  period: '30 个工作日'
}

const details = ref([
  { id: 1, name: '企业官网改版设计服务', spec: '含首页 / 内页共 8 个页面', qty: 1, price: 28000, amount: 28000 },
  { id: 2, name: '响应式前端开发',       spec: 'PC + 移动端适配',          qty: 1, price: 18000, amount: 18000 },
  { id: 3, name: '内容管理系统开发',     spec: '文章 / 产品 / 单页管理',    qty: 1, price: 15000, amount: 15000 },
  { id: 4, name: '服务器部署与上线',     spec: '含域名解析与 SSL 证书配置', qty: 1, price: 3200,  amount: 3200  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  },
  { id: 5, name: '一年期技术维护',       spec: '7×12 小时响应',            qty: 12, price: 500,   amount: 6000  }
])

const total = computed(() =>
  details.value.reduce((s, d) => s + d.amount, 0)
)

function formatMoney(value) {
  return '¥ ' + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function openDialog() { dialogVisible.value = true }
function closeDialog() { dialogVisible.value = false }

function onBeforePrint() { console.log('开始导出…') }
function onAfterPrint() { console.log('导出完成') }
function onError(err) {
  console.error('导出失败', err)
  alert('导出失败：' + (err?.message || '未知错误'))
}
</script>

<style>
/* ---------------- 主页面 ---------------- */
.home-page {
  min-height: 100vh;
  padding: 32px;
  background: #f5f7fa;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC",
    "Microsoft YaHei", sans-serif;
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

.page-body { color: #646a73; }

/* ---------------- Dialog ---------------- */
.my-dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 16px;
  overflow: auto;
  z-index: 1000;
}

.my-dialog {
  background: #f5f7fa;
  border-radius: 10px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  max-width: min(1200px, 100%);
  max-height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.my-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  border-bottom: 1px solid #e5e6eb;
  background: #fff;
}
.my-dialog-header h3 { margin: 0; font-size: 16px; }

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* ★ 方向切换按钮组 ★ */
.orient-switch {
  display: inline-flex;
  padding: 2px;
  border-radius: 8px;
  background: #f2f3f5;
}

.orient-btn {
  padding: 5px 16px;
  font-size: 13px;
  font-family: inherit;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #646a73;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.orient-btn:hover { color: #1f2329; }
.orient-btn.active {
  background: #fff;
  color: #2b5cff;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .08);
}

.close-btn {
  width: 32px;
  height: 32px;
  font-size: 22px;
  line-height: 1;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #646a73;
  border-radius: 6px;
}
.close-btn:hover { background: #f2f3f5; }

.my-dialog-body {
  padding: 20px;
  overflow: auto;
}

/* ============================================================
   ★ 插槽内容样式：统一用 .a4-slot 前缀
   屏幕预览 / 打印克隆 / Teleport 都能命中
   ============================================================ */
.a4-slot .doc-brand {
  font-size: 10pt;
  letter-spacing: 2px;
  color: #646a73;
}
.a4-slot .doc-title {
  margin: 4px 0 8px;
  font-size: 18pt;
  font-weight: 600;
  text-align: center;
}
.a4-slot .doc-sub {
  display: flex;
  justify-content: space-between;
  font-size: 10pt;
  color: #646a73;
}
.a4-slot .doc-footer {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

/* 信息网格：默认两列，横向时三列 */
.a4-slot .info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px 24px;
  margin-bottom: 18px;
  font-size: 11pt;
}
.a4-slot .info-grid.cols-3 {
  grid-template-columns: repeat(3, 1fr);
}
.a4-slot .info-item  { display: flex; gap: 8px; }
.a4-slot .info-label { color: #646a73; min-width: 5em; flex-shrink: 0; }

.a4-slot .section-title {
  font-size: 13pt;
  font-weight: 600;
  margin: 20px 0 10px;
  padding-left: 10px;
  border-left: 4px solid #2b5cff;
}

.a4-slot .doc-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10pt;
}
.a4-slot .doc-table th,
.a4-slot .doc-table td {
  border: 1px solid #dee0e3;
  padding: 7px 10px;
  text-align: left;
  vertical-align: top;
  line-height: 1.55;
}
.a4-slot .doc-table thead th { background: #f5f7fa; font-weight: 600; }
.a4-slot .doc-table tbody tr:nth-child(even) td { background: #fafbfc; }
.a4-slot .text-right  { text-align: right  !important; }
.a4-slot .text-center { text-align: center !important; }
.a4-slot .total-row td { font-weight: 600; background: #eef2ff !important; }

.a4-slot .doc-note {
  padding: 12px 14px;
  background: #f7f8fa;
  border-radius: 4px;
  font-size: 10.5pt;
  color: #646a73;
  line-height: 1.75;
}
.a4-slot .doc-note p { margin: 0; }
.a4-slot .doc-note p + p { margin-top: 4px; }
</style>