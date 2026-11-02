<script setup>
import { ref, defineProps, defineExpose } from 'vue'
import './a4-styles.css'   // ★ 引入全局样式

defineProps({
  orientation: {
    type: String,
    default: 'portrait',
    validator: (v) => ['portrait', 'landscape'].includes(v)
  }
})

const wrapperRef = ref(null)
const pageRef = ref(null)

defineExpose({ wrapperRef, pageRef })
</script>

<template>
  <div ref="wrapperRef" class="a4-print-wrapper" :class="`is-${orientation}`">
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