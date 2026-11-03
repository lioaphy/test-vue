import { getA4Metrics, MM_TO_PX } from './useA4Metrics'

/**
 * A4 打印逻辑
 * - 克隆 A4 内容到 body 顶层
 * - 注入 @page 规则与表格 height
 * - 临时修改 document.title 以控制默认文件名
 * - 打印结束自动清理
 */
export function createA4Print({
  getPageEl,
  getOrientation,
  getFileName,
  isDisabled,
  isPrinting,
  setPrinting,
  nextTick,
  onBeforePrint,
  onAfterPrint,
  onError
}) {
  let portalEl = null
  let pageStyleEl = null
  let fallbackTimer = null
  let originalTitle = ''

  /* ---------------- @page 注入 ---------------- */
  function removePageStyle() {
    if (pageStyleEl?.parentNode) pageStyleEl.parentNode.removeChild(pageStyleEl)
    pageStyleEl = null
  }

  function applyPageStyle() {
    removePageStyle()
    const m = getA4Metrics(getOrientation())
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

  /* ---------------- 打印前给正文设 min-height ---------------- */
  function applyBodyMinHeight(clone) {
    const m = getA4Metrics(getOrientation())
    const contentAreaPx = (m.pageH - m.marginTop - m.marginBottom) * MM_TO_PX

    const headerCell = clone.querySelector('thead > tr > td')
    const footerCell = clone.querySelector('tfoot > tr > td')
    const bodyEl = clone.querySelector('.a4-doc-body')

    const headerH = headerCell?.getBoundingClientRect().height || 0
    const footerH = footerCell?.getBoundingClientRect().height || 0
    const SAFE = 6

    const bodyMinPx = Math.max(
      100,
      Math.floor(contentAreaPx - headerH - footerH - SAFE)
    )
    if (bodyEl) bodyEl.style.minHeight = bodyMinPx + 'px'
  }

  /* ---------------- 清理 ---------------- */
  function cleanup() {
    window.removeEventListener('afterprint', handleAfterPrint)
    clearTimeout(fallbackTimer)
    fallbackTimer = null

    if (portalEl?.parentNode) portalEl.parentNode.removeChild(portalEl)
    portalEl = null

    document.body.classList.remove('a4-printing')
    removePageStyle()

    if (originalTitle) {
      document.title = originalTitle
      originalTitle = ''
    }
  }

  function handleAfterPrint() {
    cleanup()
    setPrinting(false)
    onAfterPrint?.()
  }

  /* ---------------- 主流程 ---------------- */
  async function handlePrint() {
    if (isPrinting() || isDisabled()) return

    setPrinting(true)
    onBeforePrint?.()

    /* 修改 document.title，控制“另存为 PDF”默认文件名 */
    originalTitle = document.title
    document.title = getFileName() || 'document'

    await nextTick()
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r))
    )

    const source = getPageEl()
    if (!source) {
      setPrinting(false)
      document.title = originalTitle
      originalTitle = ''
      return
    }

    const wrapper = source.closest('.a4-print-wrapper') || source
    const clone = wrapper.cloneNode(true)

    /* 离屏测量并设 min-height */
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

    /* 挂到正式打印 portal */
    portalEl = document.createElement('div')
    portalEl.className = 'a4-print-portal-wrapper'
    portalEl.appendChild(clone)
    document.body.appendChild(portalEl)

    document.body.classList.add('a4-printing')
    applyPageStyle()

    try {
      window.addEventListener('afterprint', handleAfterPrint)
      window.print()

      fallbackTimer = setTimeout(() => {
        if (isPrinting()) handleAfterPrint()
      }, 6000)
    } catch (err) {
      cleanup()
      setPrinting(false)
      onError?.(err)
    }
  }

  return { handlePrint, cleanup }
}