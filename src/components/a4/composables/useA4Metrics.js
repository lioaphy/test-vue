/**
 * A4 页面尺寸与边距统一计算
 * @param {'portrait'|'landscape'} orientation
 */
export function getA4Metrics(orientation = 'portrait') {
  const isLandscape = orientation === 'landscape'
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

/** mm → px（CSS 打印使用 96dpi） */
export const MM_TO_PX = 3.7795