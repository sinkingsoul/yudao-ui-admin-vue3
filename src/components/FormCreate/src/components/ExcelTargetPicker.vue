<template>
  <div class="fc-excel-target-picker">
    <el-input
      v-model="inner"
      placeholder="输入表格表单pro组件ID"
      clearable
      class="w-1/1"
    />
    <el-select
      v-model="inner"
      placeholder="选择目标表格组件"
      filterable
      class="w-1/1"
    >
      <el-option
        v-for="opt in options"
        :key="opt.value"
        :label="opt.label"
        :value="opt.value"
      />
    </el-select>
  </div>
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

const emit = defineEmits(['update:modelValue'])
const inner = ref(props.modelValue || '')
const options = ref<Opt[]>([])

watch(() => props.modelValue, (v) => {
  if (v !== inner.value) inner.value = v || ''
})
watch(inner, (v) => emit('update:modelValue', v))

const fcInject = computed(() => props.formCreateInject)

function collectRuleTree(inj: any): any[] | null {
  if (!inj) return null
  if (Array.isArray(inj) && inj.length > 0) return inj

  // 从设计区域获取规则树
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
    if (typeof inj.getRule === 'function') {
      const r = inj.getRule()
      if (Array.isArray(r) && r.length > 0) return r
    }
  } catch {}

  try {
    const api = inj.api || inj.fapi
    if (api && typeof api.getRule === 'function') {
      const r = api.getRule()
      if (Array.isArray(r) && r.length > 0) return r
    }
  } catch {}

  try {
    const api = inj.api || inj.fapi
    if (api) {
      const candidates = [api.rule, api.rules, api.option?.rule, api.options?.rule]
      for (const candidate of candidates) {
        if (Array.isArray(candidate) && candidate.length > 0) return candidate
      }
    }
  } catch {}

  return null
}

function isTableFormLike(r: any): boolean {
  if (!r) return false
  const type = r.type || r.name
  const typeMatches = ['TableFormPro', 'TableForm', 'tableForm', 'tableFormPro', 'table-form', 'table-form-pro']
  if (typeMatches.includes(type)) return true
  if (Array.isArray(r.children) && r.children.some((c: any) => {
    const childType = c?._fc_drag_tag || c?.type
    return childType === 'tableFormColumn' || childType === 'table-form-column'
  })) return true
  if (Array.isArray(r?.props?.columns) && r.props.columns.length > 0) return true
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

async function resolveNodeByField(field: string): Promise<any | null> {
  const inj: any = fcInject.value
  if (!inj || !field) return null
  try {
    const api = inj.api || inj.fapi
    if (api && typeof api.getRule === 'function') {
      const r = api.getRule(field)
      if (Array.isArray(r)) return r[0] || null
      if (r && typeof r === 'object') return r
    }
  } catch {}
  const tree = collectRuleTree(inj)
  if (Array.isArray(tree)) {
    const stack = [...tree]
    while (stack.length) {
      const node = stack.shift()
      if (!node) continue
      if (node.field === field) return node
      if (Array.isArray(node.children)) stack.push(...node.children)
      if (node.props?.rule && Array.isArray(node.props.rule)) stack.push(...node.props.rule)
      if (Array.isArray(node.rule)) stack.push(...node.rule)
    }
  }
  return null
}

async function refreshOptions() {
  const inj: any = fcInject.value
  const tree = collectRuleTree(inj)
  const list: Opt[] = []
  const seen = new Set<string>()
  const walk = (arr: any[]) => {
    arr?.forEach((r) => {
      if (!r) return
      if (isTableFormLike(r) && r.field && !seen.has(r.field)) {
        seen.add(r.field)
        const field = r.field
        const name = pickDisplayName(r)
        const label = `${name}(${field})`
        list.push({ label, value: field })
      }
      if (Array.isArray(r.children) && r.children.length) walk(r.children)
      if (r.props?.rule && Array.isArray(r.props.rule)) walk(r.props.rule)
      if (Array.isArray(r.rule)) walk(r.rule)
    })
  }
  if (Array.isArray(tree)) walk(tree)

  const v = inner.value?.trim()
  if (v && !list.some((i) => i.value === v)) {
    const node = await resolveNodeByField(v)
    if (node) {
      const name = pickDisplayName(node)
      list.push({ label: `${name}(${v})`, value: v })
    } else {
      list.push({ label: `${v}(${v})`, value: v })
    }
  }
  options.value = list
}

onMounted(() => {
  refreshOptions()
  setTimeout(() => refreshOptions(), 500)
})

watch(() => fcInject.value, () => refreshOptions(), { deep: true, immediate: true })
watch(inner, () => refreshOptions())
</script>

<script lang="ts">
export default { name: 'ExcelTargetPicker' }
</script>

<style scoped>
.fc-excel-target-picker {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}
</style>

