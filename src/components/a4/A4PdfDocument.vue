<!-- ============================================================
     A4PdfDocument.vue
     PDF 业务组件
     - 提供「下载 PDF」和「新标签页预览」两个按钮
     - 通过 useA4Pdf 处理：html2canvas 渲染、分页切片、
       表头跨页重复、切片对齐到表格行边界
     - 纸张渲染交给 A4Paper.vue
     - 样式统一在 a4-style.css
     ============================================================ -->
<template>
  <div class="a4-doc-container">
    <div class="a4-toolbar no-print" :class="{ 'is-landscape': orientation === 'landscape' }">
      <slot name="toolbar">
        <button type="button" class="a4-btn a4-btn-outline" :disabled="generating || disabled" @click="handleDownload">
          {{ generating ? generatingText : downloadText }}
        </button>

        <button type="button" class="a4-btn a4-btn-outline" :disabled="generating || disabled" @click="handlePreview">
          {{ generating ? generatingText : previewText }}
        </button>
      </slot>
    </div>

    <A4Paper ref="paperRef" :orientation="orientation">
      <template v-if="$slots.header" #header>
        <slot name="header" />
      </template>

      <template v-if="$slots.footer" #footer>
        <slot name="footer" />
      </template>

      <slot />
    </A4Paper>
  </div>
</template>

<script setup>
import { ref, defineEmits, defineProps, defineExpose } from 'vue'
import A4Paper from './A4Paper.vue'
import { useA4Pdf } from './composables/useA4Pdf'

/* ---------------- props ---------------- */
const props = defineProps({
  /** 下载按钮文字 */
  downloadText: { type: String, default: '下载 PDF' },
  /** 预览按钮文字 */
  previewText: { type: String, default: '新标签页预览' },
  /** 生成中文字 */
  generatingText: { type: String, default: '生成中…' },
  /** 下载时的文件名（不含 .pdf） */
  fileName: { type: String, default: 'document' },
  /** 是否禁用 */
  disabled: { type: Boolean, default: false },
  /** PDF 导出时是否让表格表头按页重复 */
  repeatTableHeader: { type: Boolean, default: true },
  /** 重复表头与正文之间的间距（mm） */
  theadGapMm: { type: Number, default: 1 },
  /** 纸张方向 */
  orientation: {
    type: String,
    default: 'portrait',
    validator: (v) => ['portrait', 'landscape'].includes(v)
  }
})

/* ---------------- emits ---------------- */
const emit = defineEmits(['before-print', 'after-print', 'error'])

/* ---------------- A4Paper 引用 ---------------- */
const paperRef = ref(null)

/* ---------------- PDF 逻辑 ---------------- */
const { generating, handleDownload, handlePreview } = useA4Pdf({
  getPageEl: () => paperRef.value?.pageRef,
  getOrientation: () => props.orientation,
  getFileName: () => props.fileName,
  isDisabled: () => props.disabled,
  repeatTableHeader: () => props.repeatTableHeader,
  theadGapMm: () => props.theadGapMm,
  onBeforePrint: () => emit('before-print'),
  onAfterPrint: () => emit('after-print'),
  onError: (err) => emit('error', err)
})

/* ---------------- 暴露实例方法给父组件 ---------------- */
defineExpose({
  downloadPdf: handleDownload,
  previewPdf: handlePreview,
  paperRef
})
</script>