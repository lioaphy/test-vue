<!-- ============================================================
     A4PrintDocument.vue
     打印业务组件
     - 只提供「打印 / 导出 PDF」按钮
     - 通过 useA4Print 处理：克隆、@page 注入、页脚贴底、title 替换
     - 纸张渲染交给 A4Paper.vue
     - 样式统一在 a4-style.css
     ============================================================ -->
<template>
  <div class="a4-doc-container">
    <div class="a4-toolbar no-print" :class="{ 'is-landscape': orientation === 'landscape' }">
      <slot name="toolbar">
        <button type="button" class="a4-btn a4-btn-primary" :disabled="printing || disabled" @click="handlePrint">
          {{ printing ? printingText : printText }}
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
import { createA4Print } from './composables/useA4Print'

export default {
  name: 'A4PrintDocument',
  components: { A4Paper },
  props: {
    printText: { type: String, default: '打印 / 导出 PDF' },
    printingText: { type: String, default: '正在准备…' },
    fileName: { type: String, default: 'document' },
    disabled: { type: Boolean, default: false },
    orientation: {
      type: String,
      default: 'portrait',
      validator: value => ['portrait', 'landscape'].includes(value)
    }
  },
  data() {
    return {
      printing: false,
      printController: null
    }
  },
  created() {
    this.printController = createA4Print({
      getPageEl: () => this.$refs.paperRef && this.$refs.paperRef.getPageEl(),
      getOrientation: () => this.orientation,
      getFileName: () => this.fileName,
      isDisabled: () => this.disabled,
      isPrinting: () => this.printing,
      setPrinting: value => { this.printing = value },
      nextTick: () => this.$nextTick(),
      onBeforePrint: () => this.$emit('before-print'),
      onAfterPrint: () => this.$emit('after-print'),
      onError: error => this.$emit('error', error)
    })
  },
  beforeDestroy() {
    this.printController.cleanup()
  },
  methods: {
    handlePrint() {
      return this.printController.handlePrint()
    },
    print() {
      return this.handlePrint()
    }
  }
}
</script>