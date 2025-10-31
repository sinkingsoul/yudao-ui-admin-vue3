<template>
  <el-select
    class="w-1/1"
    :model-value="modelValue"
    @update:modelValue="$emit('update:modelValue', $event)"
    placeholder="选择目标表格组件"
    filterable
  >
    <el-option v-for="opt in options" :key="opt.value" :label="opt.label" :value="opt.value" />
  </el-select>
</template>

<script lang="ts" setup>
interface Opt { label: string; value: string }

interface Props {
  modelValue?: string
  formCreateInject?: any
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: ''
})

const options = ref<Opt[]>([])
const fcInject = computed(() => props.formCreateInject)

function collectRuleTree(inj: any): any[] | null {
  if (!inj) return null

  // 从设计区域获取
  try {
    const designArea = document.querySelector('.fc-drag-box, .drag-box, [class*="drag"]')
    if (designArea) {
      const vueInst: any = (designArea as any).__vueParentComponent || (designArea as any).__vue__
      if (vueInst?.parent) {
        let current = vueInst.parent
        let depth = 0
        while (current && depth < 20) {
          const ctx = current.ctx || current.proxy
          if (ctx && typeof ctx.getRule === 'function') {
            try {
              const r = ctx.getRule()
              if (Array.isArray(r) && r.length > 0) return r
            } catch {}
          }
          current = current.parent
          depth++
        }
      }
    }
  } catch {}

  // 从表单实例获取
  try {
    const formEls = document.querySelectorAll('.fc-form, [class*="form-create"]')
    for (const formEl of Array.from(formEls)) {
      const vueInst: any = (formEl as any).__vueParentComponent || (formEl as any).__vue__
      if (vueInst) {
        const candidates = [vueInst.ctx, vueInst.proxy, vueInst.exposed, vueInst.setupState]
        for (const cand of candidates) {
          if (cand && cand.$r && Array.isArray(cand.$r) && cand.$r.length > 0) return cand.$r
          if (cand && typeof cand.getRule === 'function') {
            try {
              const r = cand.getRule()
              if (Array.isArray(r) && r.length > 0) return r
            } catch {}
          }
        }
      }
    }
  } catch {}

  // 降级方案
  try {
    const api = inj.api || inj.fapi
    if (api && typeof api.getRule === 'function') {
      const r = api.getRule()
      if (Array.isArray(r) && r.length > 0) return r
    }
  } catch {}

  try {
    const paths = [inj.rule, inj.rules, inj.option?.rule, inj.options?.rule, inj.form?.rule, inj.form?.options?.rule]
    for (const candidate of paths) {
      if (Array.isArray(candidate) && candidate.length > 0) return candidate
    }
  } catch {}

  return null
}

function isTableFormLike(r: any): boolean {
  if (!r) return false
  const type = r.type || r.name
  if (type === 'TableFormPro' || type === 'TableForm' || type === 'tableForm' || type === 'tableFormPro') return true
  if (Array.isArray(r.children) && r.children.some((c: any) => c?._fc_drag_tag === 'tableFormColumn' || c?.type === 'tableFormColumn')) return true
  if (Array.isArray(r?.props?.columns)) return true
  return false
}

function pickDisplayName(r: any): string {
  const field = (r?.field ?? '').toString().trim()
  const t1 = typeof r?.title === 'string' ? r.title.trim() : ''
  if (t1 && t1 !== field) return t1
  const t2 = typeof r?.props?.title === 'string' ? r.props.title.trim() : ''
  if (t2 && t2 !== field) return t2
  const c1 = Array.isArray(r?.children) && r.children.find((c: any) => c?.props?.label)
  if (c1?.props?.label) return String(c1.props.label)
  const c2 = Array.isArray(r?.props?.columns) && r.props.columns.find((c: any) => c?.label)
  if (c2?.label) return String(c2.label)
  return '表格表单pro'
}

function refreshOptions() {
  const inj: any = fcInject.value
  const tree = collectRuleTree(inj)
  const list: Opt[] = []
  const seen = new Set<string>()
  const walk = (arr: any[]) => {
    arr?.forEach((r) => {
      if (!r) return
      if (isTableFormLike(r) && r.field && !seen.has(r.field)) {
        seen.add(r.field)
        const name = pickDisplayName(r)
        list.push({ label: `${name}(${r.field})`, value: r.field })
      }
      if (Array.isArray(r.children) && r.children.length) walk(r.children)
      if (r.props?.rule && Array.isArray(r.props.rule)) walk(r.props.rule)
      if (Array.isArray(r.rule)) walk(r.rule)
    })
  }
  if (Array.isArray(tree)) walk(tree)

  if (props.modelValue && !list.some((i) => i.value === props.modelValue)) {
    const v = props.modelValue
    list.push({ label: `${v}(${v})`, value: v })
  }
  options.value = list
}

onMounted(() => refreshOptions())
watch(() => fcInject.value, () => refreshOptions(), { deep: true })
watch(() => props.modelValue, () => refreshOptions())
</script>

<script lang="ts">
export default { name: 'ExcelTargetSelect' }
</script>
