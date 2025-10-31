import {
  useDictSelectRule,
  useEditorRule,
  useSelectRule,
  useUploadFileRule,
  useUploadImgRule,
  useUploadImgsRule,
  useDownloadRule,
  useTableFormProRule,
  useExcelImportRule
} from './config'
import { Ref, onMounted, nextTick } from 'vue'
import { Menu } from '@/components/FormCreate/src/type'
import { apiSelectRule } from '@/components/FormCreate/src/config/selectRule'

/**
 * 表单设计器增强 hook
 * 新增
 * - 文件上传
 * - 单图上传
 * - 多图上传
 * - 字典选择器
 * - 用户选择器
 * - 部门选择器
 * - 富文本
 */
export const useFormCreateDesigner = async (designer: Ref) => {
  const editorRule = useEditorRule()
  const uploadFileRule = useUploadFileRule()
  const uploadImgRule = useUploadImgRule()
  const downloadRule = useDownloadRule()
  const uploadImgsRule = useUploadImgsRule()
  const tableFormProRule = useTableFormProRule()
  const excelImportRule = useExcelImportRule()

  /**
   * 构建表单组件
   */
  const buildFormComponents = () => {
    // 移除自带的上传组件规则，使用 uploadFileRule、uploadImgRule、uploadImgsRule 替代
    designer.value?.removeMenuItem('upload')
    // 移除自带的富文本组件规则，使用 editorRule 替代
    designer.value?.removeMenuItem('fcEditor')
    const components = [editorRule, uploadFileRule, uploadImgRule, uploadImgsRule, downloadRule, excelImportRule]
    components.forEach((component) => {
      // 插入组件规则
      designer.value?.addComponent(component)
      // 插入拖拽按钮到 `main` 分类下
      designer.value?.appendMenuItem('main', {
        icon: component.icon,
        name: component.name,
        label: component.label
      })
    })

    // 将表格表单pro加入到子表单分类（通过规则的 menu 自动挂载，避免重复 append）
    const d: any = designer.value
    if (d) {
      d.removeMenuItem && d.removeMenuItem('TableFormPro')
      if (!d._addedTableFormPro) {
        d._addedTableFormPro = true
        d.addComponent && d.addComponent(tableFormProRule)
        // 不再手动 appendMenuItem 到 subform，交由规则的 menu 字段处理
      }
    }
  }

  // 系统字段规则
  const userSelectRule = useSelectRule({
    name: 'UserSelect',
    label: '用户选择器',
    icon: 'icon-user-o'
  })
  const deptSelectRule = useSelectRule({
    name: 'DeptSelect',
    label: '部门选择器',
    icon: 'icon-address-card-o'
  })
  const dictSelectRule = useDictSelectRule()
  const apiSelectRule0 = useSelectRule({
    name: 'ApiSelect',
    label: '接口选择器',
    icon: 'icon-server',
    props: [...apiSelectRule],
    event: ['click', 'change', 'visibleChange', 'clear', 'blur', 'focus']
  })

  /**
   * 构建系统字段菜单
   */
  const buildSystemMenu = () => {
    // 移除自带的下拉选择器组件，使用 currencySelectRule 替代
    // designer.value?.removeMenuItem('select')
    // designer.value?.removeMenuItem('radio')
    // designer.value?.removeMenuItem('checkbox')
    const components = [userSelectRule, deptSelectRule, dictSelectRule, apiSelectRule0]
    const menu: Menu = {
      name: 'system',
      title: '系统字段',
      list: components.map((component) => {
        // 插入组件规则
        designer.value?.addComponent(component)
        // 插入拖拽按钮到 `system` 分类下
        return {
          icon: component.icon,
          name: component.name,
          label: component.label
        }
      })
    }
    designer.value?.addMenu(menu)
  }

  onMounted(async () => {
    await nextTick()
    buildFormComponents()
    buildSystemMenu()
  })
}
