<!-- ============================================================
     A4PrintDocument.vue
     A4 纸张预览 + 打印 / 导出 PDF

     本次修复：打印时最后一页 footer 不贴底
     原因：table-footer-group 只在内容区底部重复，
           内容不足一页时 tfoot 紧跟 tbody，不贴物理页面底部
     解决：
       1. 打印时给 .a4-print-table 设 height = 内容区高度
          表格布局算法会自动把多余空间分给 tbody，tfoot 沉底
       2. 同时修正 applyBodyMinHeight 的高度计算（含 margin）
          作为双保险
     ============================================================ -->
<template>
  <div class="a4-print-wrapper" :class="`is-${orientation}`">
    <div class="a4-toolbar no-print">
      <slot name="toolbar">
        <button
          type="button"
          class="a4-btn a4-btn-primary"
          :disabled="busy"
          @click="handlePrint"
        >
          {{ printing ? printingText : printText }}
        </button>

        <button
          type="button"
          class="a4-btn a4-btn-outline"
          :disabled="busy"
          @click="handleDownload"
        >
          {{ generating ? generatingText : downloadText }}
        </button>

        <button
          type="button"
          class="a4-btn a4-btn-outline"
          :disabled="busy"
          @click="handlePreview"
        >
          {{ generating ? generatingText : previewText }}
        </button>
      </slot>
    </div>

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
import { ref, computed, nextTick, onBeforeUnmount, defineEmits , defineProps, defineExpose } from 'vue'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

/* ---------------- props ---------------- */
const props = defineProps({
  printText: { type: String, default: '打印 / 导出 PDF' },
  printingText: { type: String, default: '正在准备…' },
  downloadText: { type: String, default: '下载 PDF' },
  previewText: { type: String, default: '新标签页预览' },
  generatingText: { type: String, default: '生成中…' },
  fileName: { type: String, default: 'document' },
  disabled: { type: Boolean, default: false },
  orientation: {
    type: String,
    default: 'portrait',
    validator: (v) => ['portrait', 'landscape'].includes(v)
  },
  repeatTableHeader: { type: Boolean, default: true },
  /** 表头与正文之间的间距（mm） */
  theadGapMm: { type: Number, default: 1 }
})

const emit = defineEmits(['before-print', 'after-print', 'error'])

const pageRef = ref(null)
const printing = ref(false)
const generating = ref(false)
const busy = computed(() => printing.value || generating.value)

let fallbackTimer = null
let portalEl = null
let pageStyleEl = null

const MM_TO_PX = 3.7795

/* ============================================================
   页面尺寸常量
   ============================================================ */
function getPageMetrics() {
  const isLandscape = props.orientation === 'landscape'
  return {
    isLandscape,
    orient: isLandscape ? 'landscape' : 'portrait',
    pageW: isLandscape ? 297 : 210,
    pageH: isLandscape ? 210 : 297,
    marginTop: isLandscape ? 10 : 14,
    marginBottom: isLandscape ? 10 : 14,
    marginLeft: isLandscape ? 14 : 16,
    marginRight: isLandscape ? 14 : 16
  }
}

/* ============================================================
   @page 动态注入 + 表格 height
   ============================================================ */
function removePageStyle() {
  if (pageStyleEl && pageStyleEl.parentNode) {
    pageStyleEl.parentNode.removeChild(pageStyleEl)
  }
  pageStyleEl = null
}

function applyPageStyle() {
  removePageStyle()

  const m = getPageMetrics()
  const contentH = m.pageH - m.marginTop - m.marginBottom

  pageStyleEl = document.createElement('style')
  pageStyleEl.setAttribute('data-a4-print-page', '')
  pageStyleEl.textContent = `
    @page {
      size: A4 ${m.orient};
      margin: ${m.marginTop}mm ${m.marginRight}mm ${m.marginBottom}mm ${m.marginLeft}mm;
    }
    @media print {
      body.a4-printing .a4-print-portal-wrapper .a4-print-table {
        height: ${contentH}mm;
      }
    }
  `
  document.head.appendChild(pageStyleEl)
}

/* ============================================================
   打印：正文 min-height 双保险
   ============================================================ */
function applyBodyMinHeight(clone) {
  const m = getPageMetrics()
  const contentAreaPx =
    (m.pageH - m.marginTop - m.marginBottom) * MM_TO_PX

  const headerCell = clone.querySelector('thead > tr > td')
  const footerCell = clone.querySelector('tfoot > tr > td')
  const bodyEl = clone.querySelector('.a4-doc-body')

  const headerH = headerCell ? headerCell.getBoundingClientRect().height : 0
  const footerH = footerCell ? footerCell.getBoundingClientRect().height : 0

  const SAFE = 6

  const bodyMinPx = Math.max(
    100,
    Math.floor(contentAreaPx - headerH - footerH - SAFE)
  )

  if (bodyEl) bodyEl.style.minHeight = bodyMinPx + 'px'
}

/* ============================================================
   ★ 关键修改：测量表格时同时记录每一行的边界
   ============================================================ */
function measureTables(bodyEl, scale) {
  if (!bodyEl) return []

  const bodyRect = bodyEl.getBoundingClientRect()
  const tables = bodyEl.querySelectorAll('table')
  const results = []

  tables.forEach((table) => {
    const thead = table.querySelector('thead')
    if (!thead) return

    const tableRect = table.getBoundingClientRect()
    const theadRect = thead.getBoundingClientRect()

    /* 记录 tbody 中每一行的上下边界（canvas 像素） */
    const rowBoundaries = []
    table.querySelectorAll('tbody > tr').forEach((row) => {
      const rect = row.getBoundingClientRect()
      rowBoundaries.push({
        top: (rect.top - bodyRect.top) * scale,
        bottom: (rect.bottom - bodyRect.top) * scale
      })
    })

    const startPx = (tableRect.top - bodyRect.top) * scale
    const endPx = (tableRect.bottom - bodyRect.top) * scale
    const theadHeightPx = theadRect.height * scale

    if (theadHeightPx > 0 && endPx > startPx) {
      results.push({
        startPx,
        endPx,
        theadHeightPx,
        rowBoundaries
      })
    }
  })

  results.sort((a, b) => a.startPx - b.startPx)
  return results
}

/* ============================================================
   ★ 新增：把切片终点对齐到表格行边界
   返回调整后的 sliceHeightPx
   ============================================================ */
function alignSliceToRowBoundary(currentY, sliceHeightPx, tableInfos) {
  if (!tableInfos.length) return sliceHeightPx

  const sliceEnd = currentY + sliceHeightPx

  for (const t of tableInfos) {
    /* 当前切片跨越了这个表格 */
    if (currentY < t.endPx && sliceEnd > t.startPx) {
      const bodyStart = t.startPx + t.theadHeightPx

      /* 切片终点落在表格正文区域内部 → 需要对齐 */
      if (sliceEnd > bodyStart && sliceEnd < t.endPx) {
        let bestBoundary = -1
        for (const rb of t.rowBoundaries) {
          if (rb.bottom <= sliceEnd && rb.bottom > currentY) {
            bestBoundary = rb.bottom
          }
        }

        if (bestBoundary > 0) {
          const newHeight = bestBoundary - currentY
          /* 太小的切片会导致页数暴增，至少保留 30px */
          if (newHeight >= 30) {
            return newHeight
          }
        }
      }
    }
  }

  return sliceHeightPx
}

/* ============================================================
   打印
   ============================================================ */
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
}

function onAfterPrint() {
  cleanup()
  printing.value = false
  emit('after-print')
}

async function handlePrint() {
  if (busy.value || props.disabled) return

  printing.value = true
  emit('before-print')

  await nextTick()
  await new Promise((r) =>
    requestAnimationFrame(() => requestAnimationFrame(r))
  )

  const source = pageRef.value
  if (!source) {
    printing.value = false
    return
  }

  const wrapper = source.closest('.a4-print-wrapper') || source
  const clone = wrapper.cloneNode(true)

  const measureWrap = document.createElement('div')
  measureWrap.style.cssText =
    'position:fixed;left:-99999px;top:0;visibility:hidden;pointer-events:none;'
  measureWrap.appendChild(clone)
  document.body.appendChild(measureWrap)

  try {
    applyBodyMinHeight(clone)
  } finally {
    measureWrap.removeChild(clone)
    document.body.removeChild(measureWrap)
  }

  portalEl = document.createElement('div')
  portalEl.className = 'a4-print-portal-wrapper'
  portalEl.appendChild(clone)
  document.body.appendChild(portalEl)

  document.body.classList.add('a4-printing')
  applyPageStyle()

  window.addEventListener('afterprint', onAfterPrint)
  window.print()

  fallbackTimer = setTimeout(() => {
    if (printing.value) onAfterPrint()
  }, 6000)
}

/* ============================================================
   PDF 生成
   ============================================================ */
async function generatePdfBlob() {
  const m = getPageMetrics()
  const contentW = m.pageW - m.marginLeft - m.marginRight

  const source = pageRef.value
  if (!source) throw new Error('未找到 A4 内容')

  const wrapper = source.closest('.a4-print-wrapper') || source
  const headerEl = wrapper.querySelector('.a4-page-header')
  const footerEl = wrapper.querySelector('.a4-page-footer')
  const bodyEl = wrapper.querySelector('.a4-doc-body')

  if (!bodyEl) throw new Error('未找到正文内容')

  const originalOverflow = wrapper.style.overflow
  wrapper.style.overflow = 'visible'

  const canvasOpts = {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false
  }

  const tableInfos = props.repeatTableHeader
    ? measureTables(bodyEl, canvasOpts.scale)
    : []

  let bodyCanvas, headerCanvas = null, footerCanvas = null

  try {
    bodyCanvas = await html2canvas(bodyEl, canvasOpts)
    if (headerEl) headerCanvas = await html2canvas(headerEl, canvasOpts)
    if (footerEl) footerCanvas = await html2canvas(footerEl, canvasOpts)
  } finally {
    wrapper.style.overflow = originalOverflow
  }

  const mmPerPx = contentW / bodyCanvas.width

  const headerH = headerCanvas ? headerCanvas.height * mmPerPx : 0
  const footerH = footerCanvas ? footerCanvas.height * mmPerPx : 0

  const GAP = 5
  const headerGap = headerCanvas ? GAP : 0
  const footerGap = footerCanvas ? GAP : 0

  const bodyPerPageH =
    m.pageH - m.marginTop - m.marginBottom - headerH - footerH - headerGap - footerGap

  if (bodyPerPageH <= 0) throw new Error('页面边距过大，正文区域不足')

  const pdf = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: m.orient,
    compress: true
  })

  const headerImg = headerCanvas ? headerCanvas.toDataURL('image/jpeg', 0.92) : null
  const footerImg = footerCanvas ? footerCanvas.toDataURL('image/jpeg', 0.92) : null

  let currentY = 0
  let pageIndex = 0
  const MAX_PAGES = 500

  while (currentY < bodyCanvas.height && pageIndex < MAX_PAGES) {
    if (pageIndex > 0) pdf.addPage()

    let y = m.marginTop

    /* 页眉 */
    if (headerImg) {
      pdf.addImage(headerImg, 'JPEG', m.marginLeft, y, contentW, headerH, undefined, 'FAST')
      y += headerH + headerGap
    }

    /* 表头跨页重复 */
    let repeatingThead = null
    if (tableInfos.length) {
      for (const t of tableInfos) {
        if (currentY >= t.startPx + t.theadHeightPx && currentY < t.endPx) {
          repeatingThead = t
          break
        }
      }
    }

    let contentHeightMm = bodyPerPageH

    if (repeatingThead) {
      const theadHeightMm = repeatingThead.theadHeightPx * mmPerPx
      /* ★ 间距从 2mm 改为可配置，默认 1mm */
      const gap = props.theadGapMm
      const totalTheadNeed = theadHeightMm + gap

      if (totalTheadNeed + 10 < bodyPerPageH) {
        contentHeightMm -= totalTheadNeed

        const theadCanvas = document.createElement('canvas')
        theadCanvas.width = bodyCanvas.width
        theadCanvas.height = repeatingThead.theadHeightPx
        const tctx = theadCanvas.getContext('2d')
        tctx.fillStyle = '#ffffff'
        tctx.fillRect(0, 0, theadCanvas.width, theadCanvas.height)
        tctx.drawImage(
          bodyCanvas,
          0, repeatingThead.startPx,
          bodyCanvas.width, repeatingThead.theadHeightPx,
          0, 0,
          bodyCanvas.width, repeatingThead.theadHeightPx
        )
        const theadImg = theadCanvas.toDataURL('image/jpeg', 0.92)

        pdf.addImage(
          theadImg, 'JPEG',
          m.marginLeft, y, contentW, theadHeightMm,
          undefined, 'FAST'
        )

        y += totalTheadNeed
      }
    }

    /* ---------- 正文切片 ---------- */
    let sliceHeightPx = Math.min(
      Math.max(1, Math.floor(contentHeightMm / mmPerPx)),
      bodyCanvas.height - currentY
    )

    /* ★ 新增：切片终点对齐到表格行边界 */
    sliceHeightPx = alignSliceToRowBoundary(
      currentY,
      sliceHeightPx,
      tableInfos
    )

    if (sliceHeightPx > 0) {
      const sliceCanvas = document.createElement('canvas')
      sliceCanvas.width = bodyCanvas.width
      sliceCanvas.height = sliceHeightPx
      const sctx = sliceCanvas.getContext('2d')
      sctx.fillStyle = '#ffffff'
      sctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height)
      sctx.drawImage(
        bodyCanvas,
        0, currentY, bodyCanvas.width, sliceHeightPx,
        0, 0, bodyCanvas.width, sliceHeightPx
      )
      const sliceImg = sliceCanvas.toDataURL('image/jpeg', 0.92)
      const sliceHeightMm = sliceHeightPx * mmPerPx
      pdf.addImage(
        sliceImg, 'JPEG',
        m.marginLeft, y, contentW, sliceHeightMm,
        undefined, 'FAST'
      )
    }

    /* 页脚贴底 */
    if (footerImg) {
      const footerY = m.pageH - m.marginBottom - footerH
      pdf.addImage(footerImg, 'JPEG', m.marginLeft, footerY, contentW, footerH, undefined, 'FAST')
    }

    currentY += sliceHeightPx
    pageIndex++
  }

  return pdf.output('blob')
}

/* ============================================================
   下载 / 预览
   ============================================================ */
async function handleDownload() {
  if (busy.value || props.disabled) return
  generating.value = true
  emit('before-print')

  try {
    const blob = await generatePdfBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${props.fileName || 'document'}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    emit('after-print')
  } catch (err) {
    console.error('[A4PrintDocument] 生成 PDF 失败：', err)
    emit('error', err)
  } finally {
    generating.value = false
  }
}

async function handlePreview() {
  if (busy.value || props.disabled) return

  const win = window.open('', '_blank')
  if (!win) {
    alert('浏览器拦截了弹出窗口，请允许弹窗后重试，或使用“下载 PDF”。')
    return
  }

  win.document.write(`
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><title>正在生成 PDF…</title>
    <style>
      body { margin:0; font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;
             display:flex; align-items:center; justify-content:center;
             height:100vh; color:#646a73; background:#f5f7fa; }
    </style></head>
    <body><p>正在生成 PDF，请稍候…</p></body></html>
  `)

  generating.value = true
  emit('before-print')

  try {
    const blob = await generatePdfBlob()
    const url = URL.createObjectURL(blob)
    win.location.href = url
    setTimeout(() => URL.revokeObjectURL(url), 60 * 1000)
    emit('after-print')
  } catch (err) {
    console.error('[A4PrintDocument] 预览 PDF 失败：', err)
    // eslint-disable-next-line no-empty
    try { win.close() } catch (_) {
      
    }
    emit('error', err)
  } finally {
    generating.value = false
  }
}

onBeforeUnmount(() => {
  cleanup()
})

defineExpose({
  print: handlePrint,
  downloadPdf: handleDownload,
  previewPdf: handlePreview,
  generatePdfBlob,
  pageRef
})
</script>

<style>
/* 样式与上一版完全一致，此处省略 */
.a4-print-wrapper,
.a4-print-wrapper * {
  box-sizing: border-box;
}

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

.a4-print-wrapper .a4-toolbar {
  width: var(--a4-page-w);
  max-width: 100%;
  margin: 0 auto 16px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.a4-print-wrapper .a4-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 13.5px;
  font-family: inherit;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  white-space: nowrap;
}
.a4-print-wrapper .a4-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.a4-print-wrapper .a4-btn-primary {
  background: var(--a4-brand);
  border-color: var(--a4-brand);
  color: #fff;
}
.a4-print-wrapper .a4-btn-primary:not(:disabled):hover {
  background: #1e47d6;
  border-color: #1e47d6;
}
.a4-print-wrapper .a4-btn-outline {
  background: #fff;
  border-color: var(--a4-line);
  color: var(--a4-ink);
}
.a4-print-wrapper .a4-btn-outline:not(:disabled):hover {
  border-color: var(--a4-brand);
  color: var(--a4-brand);
}

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
}

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

.a4-print-portal-wrapper { display: none; }

@media print {
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
  }

  body.a4-printing > :not(.a4-print-portal-wrapper) {
    display: none !important;
  }

  body.a4-printing > .a4-print-portal-wrapper {
    display: block !important;
  }

  .a4-print-wrapper .no-print,
  .a4-print-wrapper .a4-toolbar {
    display: none !important;
  }

  .a4-print-portal-wrapper .a4-print-wrapper,
  .a4-print-wrapper {
    min-height: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    overflow: visible !important;
  }

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
    /* 具体 height 由 applyPageStyle 动态注入 */
  }

  .a4-print-wrapper .a4-print-table > thead {
    display: table-header-group !important;
  }
  .a4-print-wrapper .a4-print-table > tfoot {
    display: table-footer-group !important;
  }
  .a4-print-wrapper .a4-print-table > tbody {
    display: table-row-group !important;
  }

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