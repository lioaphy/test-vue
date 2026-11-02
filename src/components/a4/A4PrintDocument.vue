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

<script setup>
import { ref, defineEmits, defineProps, defineExpose } from 'vue'
import A4Paper from './A4Paper.vue'
import { useA4Print } from './composables/useA4Print'

/* ---------------- props ---------------- */
const props = defineProps({
  /** 打印按钮文字 */
  printText: { type: String, default: '打印 / 导出 PDF' },
  /** 打印中文字 */
  printingText: { type: String, default: '正在准备…' },
  /** 打印时默认文件名（不含 .pdf） */
  fileName: { type: String, default: 'document' },
  /** 是否禁用 */
  disabled: { type: Boolean, default: false },
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

/* ---------------- 打印逻辑 ---------------- */
const { printing, handlePrint } = useA4Print({
  getPageEl: () => paperRef.value?.pageRef,
  getOrientation: () => props.orientation,
  getFileName: () => props.fileName,
  isDisabled: () => props.disabled,
  onBeforePrint: () => emit('before-print'),
  onAfterPrint: () => emit('after-print'),
  onError: (err) => emit('error', err)
})

/* ---------------- 暴露实例方法给父组件 ---------------- */
defineExpose({
  print: handlePrint,
  paperRef
})
</script>