<!-- ============================================================
     A4PrintDocument.vue
     A4 纸张预览 + 打印 / 导出 PDF（支持纵向 portrait / 横向 landscape）

     横向支持要点：
     1. 屏幕预览：通过 CSS 变量切换纸张宽高（210×297 ↔ 297×210）
     2. 打印输出：动态注入 @page { size: A4 landscape } 规则
     3. 横向时纸张比容器宽，外层容器允许横向滚动
     4. 横向时自动收紧内边距和页眉页脚间距，避免内容被挤压
     ============================================================ -->
<template>
  <div class="a4-print-wrapper" :class="`is-${orientation}`">
    <!-- 工具栏：打印时自动隐藏 -->
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

    <!-- A4 纸张：屏幕上预览用 -->
    <div ref="pageRef" class="a4-page">
      <table class="a4-print-table">
        <thead v-if="$slots.header">
          <tr>
            <td>
              <div class="a4-page-header">
                <slot name="header" />
              </div>
            </td>
          </tr>
        </thead>

        <tfoot v-if="$slots.footer">
          <tr>
            <td>
              <div class="a4-page-footer">
                <slot name="footer" />
              </div>
            </td>
          </tr>
        </tfoot>

        <tbody>
          <tr>
            <td>
              <!-- ★ 默认插槽包一层 .a4-slot，供插槽内容样式定位 ★ -->
              <div class="a4-doc-body a4-slot">
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
import { ref, nextTick, onBeforeUnmount, defineEmits , defineProps, defineExpose } from 'vue'

/* ---------------- props ---------------- */
const props = defineProps({
  printText: { type: String, default: '打印 / 导出 PDF' },
  printingText: { type: String, default: '正在准备…' },
  disabled: { type: Boolean, default: false },
  /**
   * 纸张方向
   * - 'portrait'  纵向（默认）：210mm × 297mm
   * - 'landscape' 横向：297mm × 210mm
   */
  orientation: {
    type: String,
    default: 'portrait',
    validator: (v) => ['portrait', 'landscape'].includes(v)
  }
})

const emit = defineEmits(['before-print', 'after-print'])

const pageRef = ref(null)
const printing = ref(false)

let fallbackTimer = null
let portalEl = null
let pageStyleEl = null

/* ============================================================
   @page 动态注入：按 orientation 决定纸张方向和边距
   - @page 是全局规则，无法通过响应式绑定修改
   - 打印前插入一个 <style> 到 head 末尾覆盖默认 @page
   - 打印结束后移除
   ============================================================ */
function removePageStyle() {
  if (pageStyleEl && pageStyleEl.parentNode) {
    pageStyleEl.parentNode.removeChild(pageStyleEl)
  }
  pageStyleEl = null
}

function applyPageStyle() {
  removePageStyle()

  const isLandscape = props.orientation === 'landscape'
  const orient = isLandscape ? 'landscape' : 'portrait'
  // 横向时高度只有 210mm，上下边距收紧一些
  const margin = isLandscape ? '10mm 14mm' : '14mm 16mm'

  pageStyleEl = document.createElement('style')
  pageStyleEl.setAttribute('data-a4-print-page', '')
  pageStyleEl.textContent = `@page { size: A4 ${orient}; margin: ${margin}; }`
  document.head.appendChild(pageStyleEl)
}

/* ---------------- 清理 ---------------- */
function cleanup() {
  window.removeEventListener('afterprint', onAfterPrint)
  clearTimeout(fallbackTimer)
  fallbackTimer = null

  if (portalEl && portalEl.parentNode) {
    portalEl.parentNode.removeChild(portalEl)
  }
  portalEl = null

  document.body.classList.remove('a4-printing')
  removePageStyle()
  printing.value = false
}

function onAfterPrint() {
  cleanup()
  emit('after-print')
}

/* ---------------- 核心打印逻辑 ---------------- */
async function handlePrint() {
  if (printing.value || props.disabled) return

  printing.value = true
  emit('before-print')

  // 等两帧，确保响应式更新（尤其是 orientation 切换）已渲染
  await nextTick()
  await new Promise((r) =>
    requestAnimationFrame(() => requestAnimationFrame(r))
  )

  const source = pageRef.value
  if (!source) {
    cleanup()
    return
  }

  /* 1. 克隆整个 .a4-print-wrapper，挂到 body 顶层
        克隆体带着 is-landscape / is-portrait 类，
        打印样式可以根据方向做不同处理 */
  const wrapper = source.closest('.a4-print-wrapper') || source
  const clone = wrapper.cloneNode(true)

  portalEl = document.createElement('div')
  portalEl.className = 'a4-print-portal-wrapper'
  portalEl.appendChild(clone)
  document.body.appendChild(portalEl)

  /* 2. body 打标记：打印时隐藏除 portal 外的所有内容 */
  document.body.classList.add('a4-printing')

  /* 3. 按当前方向注入 @page 规则 */
  applyPageStyle()

  /* 4. 打印 */
  window.addEventListener('afterprint', onAfterPrint)
  window.print()

  // 兜底：个别浏览器不触发 afterprint
  fallbackTimer = setTimeout(() => {
    if (printing.value) onAfterPrint()
  }, 6000)
}

onBeforeUnmount(cleanup)

defineExpose({
  print: handlePrint,
  pageRef
})
</script>

<style>
/* ============================================================
   组件样式（非 scoped，供克隆体和 portal 复用）
   ============================================================ */
.a4-print-wrapper,
.a4-print-wrapper * {
  box-sizing: border-box;
}

/* ---------------- 纸张尺寸变量 ----------------
   纵向：210mm × 297mm，内边距 18/16mm
   横向：297mm × 210mm，内边距 16/12mm（横向高度更小，边距收紧）
------------------------------------------------ */
.a4-print-wrapper {
  --a4-ink: #1f2329;
  --a4-ink-2: #646a73;
  --a4-line: #dee0e3;
  --a4-brand: #2b5cff;

  --a4-page-w: 210mm;
  --a4-page-h: 297mm;
  --a4-page-pad-x: 18mm;
  --a4-page-pad-y: 16mm;

  --a4-header-mb: 18px;
  --a4-footer-mt: 18px;

  color: var(--a4-ink);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
    "Hiragino Sans GB", "Microsoft YaHei", sans-serif;

  /* 横向纸张宽 297mm，普通屏幕放不下，允许横向滚动 */
  overflow-x: auto;
}

.a4-print-wrapper.is-landscape {
  --a4-page-w: 297mm;
  --a4-page-h: 210mm;
  --a4-page-pad-x: 16mm;
  --a4-page-pad-y: 12mm;

  --a4-header-mb: 12px;
  --a4-footer-mt: 12px;
}

/* ---------------- 工具栏 ---------------- */
.a4-print-wrapper .a4-toolbar {
  width: var(--a4-page-w);
  max-width: 100%;
  margin: 0 auto 16px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  transition: width 0.2s;
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
.a4-print-wrapper .a4-btn:hover { background: #1e47d6; }
.a4-print-wrapper .a4-btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* ---------------- A4 纸张（屏幕预览） ---------------- */
.a4-print-wrapper .a4-page {
  width: var(--a4-page-w);
  min-height: var(--a4-page-h);
  margin: 0 auto;
  padding: var(--a4-page-pad-y) var(--a4-page-pad-x);
  background: #fff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  font-size: 12pt;
  line-height: 1.7;

  display: flex;
  flex-direction: column;

  transition: width 0.2s, min-height 0.2s, padding 0.2s;
}

/* ---------------- 打印布局表格 ---------------- */
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
  margin-bottom: var(--a4-header-mb);
  border-bottom: 2px solid var(--a4-brand);
}

.a4-print-wrapper .a4-page-footer {
  padding-top: 10px;
  margin-top: var(--a4-footer-mt);
  border-top: 1px solid var(--a4-line);
  font-size: 9.5pt;
  color: var(--a4-ink-2);
}

/* ============================================================
   打印 Portal 容器：屏幕上隐藏，仅在打印时出现
   ============================================================ */
.a4-print-portal-wrapper {
  display: none;
}

/* ============================================================
   打印样式
   ============================================================ */
@media print {
  html,
  body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
  }

  /* 隐藏除 portal 外的所有 body 直接子元素 */
  body.a4-printing > :not(.a4-print-portal-wrapper) {
    display: none !important;
  }

  body.a4-printing > .a4-print-portal-wrapper {
    display: block !important;
  }

  /* 工具栏不打印 */
  .a4-print-wrapper .no-print,
  .a4-print-wrapper .a4-toolbar {
    display: none !important;
  }

  /* portal 里的 wrapper 重置屏幕装饰，并取消横向滚动 */
  .a4-print-portal-wrapper .a4-print-wrapper,
  .a4-print-wrapper {
    min-height: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    overflow: visible !important;
  }

  /* 纸张回到文档流，尺寸完全交给 @page 控制 */
  .a4-print-portal-wrapper .a4-page,
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

  /* ★ 让 thead / tfoot 在每一页重复 ★ */
  .a4-print-wrapper .a4-print-table > thead {
    display: table-header-group !important;
  }
  .a4-print-wrapper .a4-print-table > tfoot {
    display: table-footer-group !important;
  }
  .a4-print-wrapper .a4-print-table > tbody {
    display: table-row-group !important;
  }

  /* 分页优化 */
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

  .a4-print-wrapper,
  .a4-print-wrapper * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
</style>