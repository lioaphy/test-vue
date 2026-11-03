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

<script>
import A4Paper from './A4Paper.vue'
import { createA4Pdf } from './composables/useA4Pdf'

export default {
  name: 'A4PdfDocument',
  components: { A4Paper },
  props: {
    downloadText: { type: String, default: '下载 PDF' },
    previewText: { type: String, default: '新标签页预览' },
    generatingText: { type: String, default: '生成中…' },
    fileName: { type: String, default: 'document' },
    disabled: { type: Boolean, default: false },
    repeatTableHeader: { type: Boolean, default: true },
    theadGapMm: { type: Number, default: 1 },
    orientation: {
      type: String,
      default: 'portrait',
      validator: value => ['portrait', 'landscape'].includes(value)
    }
  },
  data() {
    return {
      generating: false,
      pdfController: null
    }
  },
  created() {
    this.pdfController = createA4Pdf({
      getPageEl: () => this.$refs.paperRef && this.$refs.paperRef.getPageEl(),
      getOrientation: () => this.orientation,
      getFileName: () => this.fileName,
      isDisabled: () => this.disabled,
      isGenerating: () => this.generating,
      setGenerating: value => { this.generating = value },
      repeatTableHeader: () => this.repeatTableHeader,
      theadGapMm: () => this.theadGapMm,
      onBeforePrint: () => this.$emit('before-print'),
      onAfterPrint: () => this.$emit('after-print'),
      onError: error => this.$emit('error', error)
    })
  },
  methods: {
    handleDownload() {
      return this.pdfController.handleDownload()
    },
    handlePreview() {
      return this.pdfController.handlePreview()
    },
    downloadPdf() {
      return this.handleDownload()
    },
    previewPdf() {
      return this.handlePreview()
    }
  }
}
</script>