<template>
  <div class="fc-excel-import">
    <div>
      <input
        ref="fileInput"
        type="file"
        :accept="accept"
        style="display: none"
        @change="onPickLocal"
      />
      <el-button class="fc-clock" :type="buttonType" :size="buttonSize" :loading="uploading" :disabled="disabled || uploading" @click.stop.prevent="pickLocal">
        <i v-if="showIcon" class="fc-icon icon-upload" style="margin-right: 4px;"></i>
        {{ buttonText }}
      </el-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ElMessage } from 'element-plus'

defineOptions({ name: 'ExcelImport' })

interface Props {
  modelValue?: string | string[]
  formCreateInject?: any
  targetField?: string
  append?: boolean
  parseLocal?: boolean
  fieldMap?: string
  enableTargetSelect?: boolean
  buttonText?: string
  buttonType?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'text'
  buttonSize?: 'default' | 'small' | 'large'
  showIcon?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  targetField: '',
  append: false,
  parseLocal: true,
  fieldMap: '',
  enableTargetSelect: true,
  buttonText: '导入Excel到表格',
  buttonType: 'primary',
  buttonSize: 'default',
  showIcon: true,
  disabled: false
})


const accept = '.xls,.xlsx'
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

// 目标字段：直接来自 props
const resolvedTarget = computed(() => props.targetField)

// ===== 工具函数 =====
function isTableFormLike(r: any): boolean {
  if (!r) return false
  const type = r.type || r.name
  if (type === 'TableFormPro' || type === 'TableForm' || type === 'tableForm' || type === 'tableFormPro') return true
  if (Array.isArray(r.children) && r.children.some((c: any) => c?._fc_drag_tag === 'tableFormColumn' || c?.type === 'tableFormColumn')) return true
  if (Array.isArray(r?.props?.columns)) return true
  return false
}

function collectRuleTree(inj: any): any[] | null {
  if (!inj) return null
  const api = inj.api || inj.fapi

  // 🔥 递归向上查找真正的顶层设计器
  if (api) {
    let current = api
    let depth = 0

    while (current && depth < 10) {
      // 如果有 top，继续向上
      if (current.top && current.top !== current) {
        current = current.top
        depth++
        continue
      }

      // 已到顶层，获取规则
      if (typeof current.getRule === 'function') {
        const r = current.getRule()
        if (Array.isArray(r)) return r
      }

      if (Array.isArray(current.rule)) return current.rule

      // 尝试 parent
      if (current.parent && current.parent !== current) {
        current = current.parent
        depth++
        continue
      }

      break
    }
  }

  // 降级方案

  const candidate = inj?.rule || inj?.rules || inj?.option?.rule || inj?.options?.rule || inj?.form?.rule || inj?.form?.options?.rule
  if (Array.isArray(candidate)) return candidate

  return null
}


async function getTargetRule(): Promise<any | null> {
  const inj: any = props.formCreateInject
  if (!inj) return null
  const field = resolvedTarget.value

  // 🔥 优先从顶层 API 获取规则
  try {
    const api = inj.api || inj.fapi
    if (api) {
      // 从顶层获取
      if (api.top && typeof api.top.getRule === 'function' && field) {
        const r = api.top.getRule(field)
        if (r) return Array.isArray(r) ? r[0] : r
      }

      // 从父级获取
      if (api.parent && typeof api.parent.getRule === 'function' && field) {
        const r = api.parent.getRule(field)
        if (r) return Array.isArray(r) ? r[0] : r
      }

      // 当前级别
      if (typeof api.getRule === 'function' && field) {
        const r = api.getRule(field)
        if (r) return Array.isArray(r) ? r[0] : r
      }
    }
  } catch {}

  // 降级方案：遍历规则树查找
  try {
    const tree = collectRuleTree(inj)
    if (Array.isArray(tree)) {
      const stack = [...tree]
      while (stack.length) {
        const node = stack.shift()
        if (!node) continue
        if (isTableFormLike(node) && (!field || node.field === field)) return node
        if (Array.isArray(node.children)) stack.push(...node.children)
        if (node.props?.rule && Array.isArray(node.props.rule)) stack.push(...node.props.rule)
        if (Array.isArray(node.rule)) stack.push(...node.rule)
      }
    }
  } catch {}
  return null
}


function firstControlField(r: any): string | '' {
  if (!r) return ''
  const stack: any[] = []
  if (Array.isArray(r.children)) stack.push(...r.children)
  if (r.props?.rule && Array.isArray(r.props.rule)) stack.push(...r.props.rule)
  if (Array.isArray(r.rule)) stack.push(...r.rule)
  while (stack.length) {
    const n = stack.shift()
    if (!n) continue
    if (typeof n.field === 'string' && n.field) return n.field
    if (Array.isArray(n.children)) stack.push(...n.children)
    if (n.props?.rule && Array.isArray(n.props.rule)) stack.push(...n.props.rule)
    if (Array.isArray(n.rule)) stack.push(...n.rule)
  }
  return ''
}

async function inferAutoFieldMap(): Promise<Record<string, string>> {
  const rule = await getTargetRule()
  const map: Record<string, string> = {}
  if (!rule) return map
  if (Array.isArray(rule.children) && rule.children.length) {
    rule.children.forEach((col: any) => {
      const label = col?.props?.label
      if (!label) return
      const field = firstControlField(col)
      if (field) map[label] = field
    })
  } else if (rule.props?.columns && Array.isArray(rule.props.columns)) {
    rule.props.columns.forEach((col: any) => {
      const label = col?.label
      if (!label) return
      const field = firstControlField({ children: col?.rule })
      if (field) map[label] = field
    })
  }
  return map
}

function applyMapToRows(rows: any[], map: Record<string, string>): any[] {
  if (!rows?.length || !map || !Object.keys(map).length) return rows
  return rows.map((r) => {
    const out: any = { ...r }
    Object.keys(map).forEach((from) => {
      const to = map[from]
      if (!to) return
      if (Object.prototype.hasOwnProperty.call(r, from)) {
        out[to] = r[from]
        if (to !== from) delete out[from]
      }
    })
    return out
  })
}

async function transformRows(rows: any[]): Promise<any[]> {
  if (props.fieldMap) {
    try {
      const map = JSON.parse(props.fieldMap || '{}') as Record<string, string>
      if (map && typeof map === 'object') return applyMapToRows(rows, map)
    } catch {}
  }
  const autoMap = await inferAutoFieldMap()
  return applyMapToRows(rows, autoMap)
}

function pickLocal() {
  fileInput.value?.click()
}

async function onPickLocal(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files || !files.length) return
  const file = files[0]
  ;(e.target as HTMLInputElement).value = ''
  await parseExcelLocal(file)
}

async function parseExcelLocal(file: File) {
  const lower = file.name.toLowerCase()
  if (!lower.endsWith('.xls') && !lower.endsWith('.xlsx')) {
    ElMessage.error('仅支持 .xls / .xlsx 文件')
    return
  }
  uploading.value = true
  try {
    const XLSX = await import('xlsx')
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const sheetName = wb.SheetNames[0]
    const sheet = wb.Sheets[sheetName]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })
    const transformed = await transformRows(rows)
    await writeToTarget(transformed)
    ElMessage.success('解析成功并已写入')
  } catch (e: any) {
    console.error(e)
    ElMessage.error(`解析失败：${e?.message || e}`)
  } finally {
    uploading.value = false
  }
}

async function writeToTarget(rows: any[]) {
  const api = props.formCreateInject && (props.formCreateInject.fapi || props.formCreateInject.api)
  const field = resolvedTarget.value
  if (!api || typeof api.setValue !== 'function' || !field) {
    ElMessage.error('无法定位表格组件或API，不可写入')
    return
  }
  if (props.append) {
    const oldVal = api.getValue?.(field) || []
    api.setValue(field, [...(Array.isArray(oldVal) ? oldVal : []), ...rows])
  } else {
    api.setValue(field, rows)
  }
}
</script>

<style scoped>
.fc-excel-import {
  display: inline-block;
}
</style>
