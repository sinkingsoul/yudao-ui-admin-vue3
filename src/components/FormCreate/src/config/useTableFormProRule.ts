import unique from '@form-create/utils/lib/unique'
import { localeProps } from '@/components/FormCreate/src/utils'

export const useTableFormProRule = () => {
  const label = '表格表单pro'
  const name = 'TableFormPro'
  return {
    menu: 'subform',
    icon: 'icon-table-form',
    label,
    name,
    mask: false,
    input: true,
    subForm: 'array',
    languageKey: ['add', 'operation', 'dataEmpty'],
    event: ['change', 'add', 'delete'],
    children: 'tableFormColumn',
    loadRule(rule: any) {
      if (!rule.props) rule.props = {}
      const columns = rule.props.columns || []
      rule.children = columns.map((column: any) => {
        return {
          type: 'tableFormColumn',
          _fc_drag_tag: 'tableFormColumn',
          props: {
            label: column.label,
            align: column.align,
            required: column.required || false,
            width: (column.style && column.style.width) || '',
            color: (column.style && column.style.color) || ''
          },
          children: column.rule || []
        }
      })
      delete rule.props.columns
    },
    parseRule(rule: any) {
      const children = rule.children || []
      rule.props.columns = children.map((column: any) => {
        return {
          label: column.props.label,
          required: column.props.required,
          align: column.props.align,
          style: {
            width: column.props.width,
            color: column.props.color
          },
          rule: column.children || []
        }
      })
      rule.children = []
    },
    rule({ t }: any) {
      return {
        type: name,
        field: unique(),
        title: t('com.tableForm.name'),
        info: '',
        props: {
          pagination: false,
          pageSize: 10
        },
        children: []
      }
    },
    props(_: any, { t }: any) {
      // 使用 tableForm.props 的本地化，确保通用字段显示名称
      const base = localeProps(t, 'tableForm.props', [
        { type: 'switch', field: 'disabled', title: '是否禁用' },
        { type: 'switch', field: 'addable', value: true, title: '允许新增' },
        { type: 'switch', field: 'deletable', value: true, title: '允许删除' },
        { type: 'switch', field: 'filterEmptyColumn', value: true, title: '是否过滤空行的数据' },
        { type: 'inputNumber', field: 'min', props: { min: 0 }, title: '最少添加几行' },
        { type: 'inputNumber', field: 'max', props: { min: 0 }, title: '最多添加几行，为 0 则不限制' }
      ])
      // 追加分页相关属性，显式标题
      base.push(
        { type: 'switch', field: 'pagination', title: '是否分页' },
        { type: 'inputNumber', field: 'pageSize', title: '分页条数', props: { min: 1 } }
      )
      return base
    }
  }
}
