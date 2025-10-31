import { generateUUID } from '@/utils'
import { localeProps, makeRequiredRule } from '@/components/FormCreate/src/utils'

export const useExcelImportRule = () => {
  const label = 'Excel导入'
  const name = 'ExcelImport'
  return {
    icon: 'icon-upload',
    label,
    name,
    input: false,
    rule() {
      return {
        type: name,
        field: generateUUID(),
        title: '', // 默认字段名称（标题）置空
        info: '',
        $required: false,
        props: {
          // 目标
          targetField: '',
          // 本地解析（默认开启）
          parseLocal: true,
          // 追加到已有数据
          append: false,
          // UI
          buttonText: '导入Excel到表格',
          buttonType: 'primary',
          buttonSize: 'default',
          showIcon: true,
          disabled: false
        }
      }
    },
    props(_ , { t }) {
      return localeProps(t, name + '.props', [
        makeRequiredRule(),
        // 按钮配置
        { type: 'input', field: 'buttonText', title: '按钮文本', value: '导入Excel到表格' },
        { type: 'select', field: 'buttonType', title: '按钮类型', value: 'primary', options: [
          { label: '默认', value: 'default' },
          { label: '主要', value: 'primary' },
          { label: '成功', value: 'success' },
          { label: '警告', value: 'warning' },
          { label: '危险', value: 'danger' },
          { label: '信息', value: 'info' },
          { label: '文字', value: 'text' }
        ] },
        { type: 'select', field: 'buttonSize', title: '按钮尺寸', value: 'default', options: [
          { label: '默认', value: 'default' },
          { label: '小', value: 'small' },
          { label: '大', value: 'large' }
        ] },
        { type: 'switch', field: 'showIcon', title: '显示上传图标', value: true },
        // 目标与行为
        { type: 'ExcelTargetPicker', field: 'targetField', title: '目标表格组件', value: '' },
        { type: 'switch', field: 'append', title: '追加到已有数据', value: false },
        { type: 'switch', field: 'disabled', title: '是否禁用', value: false }
      ])
    }
  }
}
