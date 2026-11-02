<!-- ============================================================
     A4PrintDocument.vue
     A4 纸张预览 + 打印 / 导出 PDF
     - header 插槽：页眉，打印时每页顶部重复
     - footer 插槽：页脚，打印时每页底部重复
     - 默认插槽  ：正文内容，自动分页
     - toolbar 插槽：工具栏，打印时自动隐藏
     ============================================================ -->
<template>
  <div class="a4-print-wrapper">
    <!-- ============ 工具栏（打印时自动隐藏） ============ -->
    <div class="a4-toolbar no-print">
      <slot name="toolbar">
        <button
          type="button"
          class="a4-btn"
          :disabled="printing || disabled"
          @click="handlePrint"
        >
          {{ printing ? printingText : printText }}
        </button>
      </slot>
    </div>

    <!-- ============ A4 纸张 ============ -->
    <div ref="pageRef" class="a4-page">
      <!--
        关键：用 table + thead / tfoot 实现「页眉页脚每页重复」。
        浏览器在打印分页时，会自动把 thead 放到每一页顶部、
        把 tfoot 放到每一页底部。
      -->
      <table class="a4-print-table">
        <!-- 页眉：每页重复 -->
        <thead v-if="$slots.header">
          <tr>
            <td>
              <div class="a4-page-header">
                <slot name="header" />
              </div>
            </td>
          </tr>
        </thead>

        <!-- 页脚：每页重复 -->
        <tfoot v-if="$slots.footer">
          <tr>
            <td>
              <div class="a4-page-footer">
                <slot name="footer" />
              </div>
            </td>
          </tr>
        </tfoot>

        <!-- 正文 -->
        <tbody>
          <tr>
            <td>
              <div class="a4-doc-body">
                <slot />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount, defineEmits , defineProps, defineExpose} from 'vue'

/* ---------------- props ---------------- */
const props = defineProps({
  /** 打印按钮文字 */
  printText: { type: String, default: '打印 / 导出 PDF' },
  /** 打印中按钮文字 */
  printingText: { type: String, default: '正在准备…' },
  /** 是否禁用打印 */
  disabled: { type: Boolean, default: false }
})

/* ---------------- emits ---------------- */
const emit = defineEmits(['before-print', 'after-print'])

/* ---------------- 内部状态 ---------------- */
const pageRef = ref(null)
const printing = ref(false)

let fallbackTimer = null

function onAfterPrint() {
  window.removeEventListener('afterprint', onAfterPrint)
  clearTimeout(fallbackTimer)
  fallbackTimer = null
  printing.value = false
  emit('after-print')
}

/**
 * 触发打印
 * 先等两帧，确保响应式更新（v-if 展开、数据变更等）已完成渲染，
 * 再调用 window.print()，避免打印到旧内容。
 */
async function handlePrint() {
  if (printing.value || props.disabled) return

  printing.value = true
  emit('before-print')

  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  )

  window.addEventListener('afterprint', onAfterPrint)
  window.print()

  // 兜底：个别浏览器不触发 afterprint
  fallbackTimer = setTimeout(() => {
    if (printing.value) onAfterPrint()
  }, 6000)
}

onBeforeUnmount(() => {
  window.removeEventListener('afterprint', onAfterPrint)
  clearTimeout(fallbackTimer)
})

/* ---------------- 暴露给父组件 ---------------- */
defineExpose({
  /** 手动触发打印，例如：docRef.value.print() */
  print: handlePrint,
  /** A4 纸张 DOM */
  pageRef
})
</script>

<!-- ============================================================
     样式：统一挂在 .a4-print-wrapper 作用域内，避免污染全局
     ============================================================ -->
<style>
/* ---------------- 基础重置 ---------------- */
.a4-print-wrapper,
.a4-print-wrapper * {
  box-sizing: border-box;
}

.a4-print-wrapper {
  --a4-ink: #1f2329;
  --a4-ink-2: #646a73;
  --a4-line: #dee0e3;
  --a4-brand: #2b5cff;

  min-height: 100vh;
  padding: 24px 16px 48px;
  color: var(--a4-ink);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
    "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}

/* ---------------- 工具栏 ---------------- */
.a4-print-wrapper .a4-toolbar {
  width: 210mm;
  max-width: 100%;
  margin: 0 auto 16px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.a4-print-wrapper .a4-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 20px;
  font-size: 14px;
  font-family: inherit;
  border: none;
  border-radius: 6px;
  background: var(--a4-brand);
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;
}
.a4-print-wrapper .a4-btn:hover {
  background: #1e47d6;
}
.a4-print-wrapper .a4-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ---------------- A4 纸张 ---------------- */
.a4-print-wrapper .a4-page {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 16mm 18mm;
  background: #fff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  font-size: 12pt;
  line-height: 1.7;

  /* 屏幕预览时让页脚沉到纸张底部 */
  display: flex;
  flex-direction: column;
}

/* ---------------- 打印布局表格 ----------------
   thead / tfoot 负责跨页重复，
   这里只消除表格默认边框与内边距
------------------------------------------------ */
.a4-print-wrapper .a4-print-table {
  width: 100%;
  border-collapse: collapse;
  flex: 1 0 auto;
}

.a4-print-wrapper .a4-print-table > thead > tr > td,
.a4-print-wrapper .a4-print-table > tbody > tr > td,
.a4-print-wrapper .a4-print-table > tfoot > tr > td {
  padding: 0;
  border: 0;
  text-align: left;
  vertical-align: top;
}

/* ---------------- 页眉 / 页脚容器 ---------------- */
.a4-print-wrapper .a4-page-header {
  padding-bottom: 10px;
  margin-bottom: 18px;
  border-bottom: 2px solid var(--a4-brand);
}

.a4-print-wrapper .a4-page-footer {
  padding-top: 10px;
  margin-top: 18px;
  border-top: 1px solid var(--a4-line);
  font-size: 9.5pt;
  color: var(--a4-ink-2);
}

/* ============================================================
   @page 与打印样式（必须放在非 scoped 样式中）
   ============================================================ */
@page {
  size: A4;
  margin: 14mm 16mm;
}

@media print {
  html,
  body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
  }

  /* 工具栏不打印 */
  .a4-print-wrapper .no-print,
  .a4-print-wrapper .a4-toolbar {
    display: none !important;
  }

  /* 去掉屏幕预览用的装饰 */
  .a4-print-wrapper {
    min-height: 0 !important;
    padding: 0 !important;
    background: #fff !important;
  }

  .a4-print-wrapper .a4-page {
    display: block !important;
    width: auto !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    box-shadow: none !important;
  }

  .a4-print-wrapper .a4-print-table {
    display: table !important;
    width: 100% !important;
    flex: none !important;
  }

  /* ★ 核心：让 thead / tfoot 在每一页重复 ★ */
  .a4-print-wrapper .a4-print-table > thead {
    display: table-header-group !important;
  }
  .a4-print-wrapper .a4-print-table > tfoot {
    display: table-footer-group !important;
  }
  .a4-print-wrapper .a4-print-table > tbody {
    display: table-row-group !important;
  }

  /* 分页优化：避免内容被拦腰截断 */
  .a4-print-wrapper tr,
  .a4-print-wrapper img,
  .a4-print-wrapper .avoid-break {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .a4-print-wrapper h1,
  .a4-print-wrapper h2,
  .a4-print-wrapper h3,
  .a4-print-wrapper .section-title {
    break-after: avoid;
    page-break-after: avoid;
  }

  /* 保留背景色 / 边框色 */
  .a4-print-wrapper,
  .a4-print-wrapper * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
</style>