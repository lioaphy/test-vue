import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { getA4Metrics } from './useA4Metrics'

/**
 * A4 PDF 生成逻辑
 * - html2canvas 渲染页眉 / 页脚 / 正文
 * - 正文按每页可用高度切分
 * - 表格表头跨页重复
 * - 切片对齐到表格行边界，避免半截行
 */
export function createA4Pdf({
  getPageEl,
  getOrientation,
  getFileName,
  isDisabled,
  isGenerating,
  setGenerating,
  repeatTableHeader = () => true,
  theadGapMm = () => 1,
  onBeforePrint,
  onAfterPrint,
  onError
}) {
  /* ---------------- 表格测量 ---------------- */
  function measureTables(bodyEl, scale) {
    if (!bodyEl) return []

    const bodyRect = bodyEl.getBoundingClientRect()
    const results = []

    bodyEl.querySelectorAll('table').forEach((table) => {
      const thead = table.querySelector('thead')
      if (!thead) return

      const tableRect = table.getBoundingClientRect()
      const theadRect = thead.getBoundingClientRect()

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
        results.push({ startPx, endPx, theadHeightPx, rowBoundaries })
      }
    })

    results.sort((a, b) => a.startPx - b.startPx)
    return results
  }

  /* ---------------- 切片终点对齐到表格行边界 ---------------- */
  function alignSliceToRowBoundary(currentY, sliceHeightPx, tableInfos) {
    if (!tableInfos.length) return sliceHeightPx

    const sliceEnd = currentY + sliceHeightPx

    for (const t of tableInfos) {
      if (currentY < t.endPx && sliceEnd > t.startPx) {
        const bodyStart = t.startPx + t.theadHeightPx

        if (sliceEnd > bodyStart && sliceEnd < t.endPx) {
          let bestBoundary = -1
          for (const rb of t.rowBoundaries) {
            if (rb.bottom <= sliceEnd && rb.bottom > currentY) {
              bestBoundary = rb.bottom
            }
          }
          if (bestBoundary > 0 && bestBoundary - currentY >= 30) {
            return bestBoundary - currentY
          }
        }
      }
    }
    return sliceHeightPx
  }

  /* ---------------- 生成 PDF Blob ---------------- */
  async function generatePdfBlob() {
    const m = getA4Metrics(getOrientation())
    const contentW = m.pageW - m.marginLeft - m.marginRight

    const source = getPageEl()
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

    const tableInfos = repeatTableHeader()
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

      /* 表头重复 */
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
        const gap = theadGapMm()
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
            0, 0, bodyCanvas.width, repeatingThead.theadHeightPx
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

      /* 正文切片 */
      let sliceHeightPx = Math.min(
        Math.max(1, Math.floor(contentHeightMm / mmPerPx)),
        bodyCanvas.height - currentY
      )
      sliceHeightPx = alignSliceToRowBoundary(currentY, sliceHeightPx, tableInfos)

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

  /* ---------------- 下载 ---------------- */
  async function handleDownload() {
    if (isGenerating() || isDisabled()) return
    setGenerating(true)
    onBeforePrint?.()

    try {
      const blob = await generatePdfBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${getFileName() || 'document'}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 2000)
      onAfterPrint?.()
    } catch (err) {
      console.error('[useA4Pdf] 生成 PDF 失败：', err)
      onError?.(err)
    } finally {
      setGenerating(false)
    }
  }

  /* ---------------- 新标签页预览 ---------------- */
  async function handlePreview() {
    if (isGenerating() || isDisabled()) return

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

    setGenerating(true)
    onBeforePrint?.()

    try {
      const blob = await generatePdfBlob()
      const url = URL.createObjectURL(blob)
      win.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60 * 1000)
      onAfterPrint?.()
    } catch (err) {
      console.error('[useA4Pdf] 预览 PDF 失败：', err)
      try { win.close() } catch (_) { /* ignore */ }
      onError?.(err)
    } finally {
      setGenerating(false)
    }
  }

  return { handleDownload, handlePreview, generatePdfBlob }
}