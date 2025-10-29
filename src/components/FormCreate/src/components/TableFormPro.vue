<template>
  <div class="_fc-table-form" :class="{ '_fc-disabled': disabled }">
    <component
      :is="Form"
      :option="options"
      :rule="rule"
      :extendOption="true"
      :disabled="disabled"
      @change="formChange"
      v-model:api="fapi"
      @emit-event="$emit"
    />
    <el-button
      link
      type="primary"
      class="fc-clock"
      v-if="addable && (!max || max > dataRowCount)"
      @click="addRaw(true)"
    >
      <i class="fc-icon icon-add-circle" style="font-weight: 700;"></i>
      {{ formCreateInject.t('add') || '添加' }}
    </el-button>
    <div v-if="pagination" class="tf-pro-pagination">
      <el-pagination
        small
        background
        layout="prev, pager, next, jumper, total"
        :page-size="pageSize"
        :current-page="currentPage"
        :total="dataRowCount"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script>
import { markRaw, reactive } from 'vue'

export default {
  name: 'TableFormPro',
  props: {
    formCreateInject: Object,
    modelValue: {
      type: Array,
      default: () => []
    },
    columns: {
      type: Array,
      required: true,
      default: () => []
    },
    filterEmptyColumn: {
      type: Boolean,
      default: true
    },
    deletable: {
      type: Boolean,
      default: true
    },
    addable: {
      type: Boolean,
      default: true
    },
    options: {
      type: Object,
      default: () =>
        reactive({
          submitBtn: false,
          resetBtn: false
        })
    },
    max: Number,
    min: Number,
    disabled: Boolean,
    // 新增分页能力
    pagination: {
      type: Boolean,
      default: false
    },
    pageSize: {
      type: Number,
      default: 10
    }
  },
  emits: ['change', 'add', 'delete', 'update:modelValue'],
  data() {
    return {
      rule: [],
      trs: [],
      fapi: {},
      Form: markRaw(this.formCreateInject.form.$form()),
      copyTrs: '',
      oldValue: '',
      currentPage: 1,
      emptyRule: {
        type: 'tr',
        _isEmpty: true,
        native: true,
        subRule: true,
        children: [
          {
            type: 'td',
            style: { textAlign: 'center' },
            native: true,
            subRule: true,
            props: {
              colspan: this.columns.length + (this.formCreateInject.preview ? 1 : 2)
            },
            children: [this.formCreateInject.t('dataEmpty') || '暂无数据']
          }
        ]
      }
    }
  },
  computed: {
    dataRowCount() {
      // 仅统计数据行，不包含空行
      if (this.trs.length === 1 && this.trs[0]._isEmpty) return 0
      return this.trs.length
    },
    pageTrs() {
      // 空数据时保留空行
      if (this.trs[0] && this.trs[0]._isEmpty) {
        return this.trs
      }
      if (!this.pagination) return this.trs
      const start = (this.currentPage - 1) * (this.pageSize || 10)
      const end = start + (this.pageSize || 10)
      return this.trs.slice(start, end)
    }
  },
  watch: {
    modelValue: {
      handler() {
        this.updateTable()
      },
      deep: true
    },
    'formCreateInject.preview': function (n) {
      this.emptyRule.children[0].props.colspan = this.columns.length + (n ? 1 : 2)
      this.refreshTbody()
    },
    pagination() {
      this.currentPage = 1
      this.refreshTbody()
    },
    pageSize() {
      this.currentPage = 1
      this.refreshTbody()
    }
  },
  created() {
    this.loadRule()
  },
  mounted() {
    this.updateTable()
  },
  methods: {
    formChange() {
      this.updateValue()
    },
    refreshTbody() {
      if (this.rule && this.rule[0] && this.rule[0].children && this.rule[0].children[1]) {
        this.rule[0].children[1].children = this.pageTrs
      }
    },
    updateValue() {
      const value = this.trs
        .map((tr, idx) => ({
          ...(this.modelValue[idx] || {}),
          ...this.fapi.getChildrenFormData(tr)
        }))
        .filter((v) => {
          if (!this.filterEmptyColumn) return true
          if (v === undefined || v === null) return false
          let flag = false
          Object.keys(v).forEach((k) => {
            flag = flag || (v[k] !== undefined && v[k] !== '' && v[k] !== null)
          })
          return flag
        })
      const str = JSON.stringify(value)
      if (str !== this.oldValue) {
        this.oldValue = str
        this.$emit('update:modelValue', value)
        this.$emit('change', value)
      }
    },
    setRawData(idx, formData) {
      const raw = this.trs[idx]
      this.fapi.setChildrenFormData(raw, formData, true)
    },
    updateTable() {
      const str = JSON.stringify(this.modelValue)
      if (this.oldValue === str) return
      this.oldValue = str
      this.trs = this.trs.splice(0, this.modelValue.length)
      if (!this.modelValue.length) {
        this.addEmpty()
      } else {
        this.clearEmpty()
      }
      this.modelValue.forEach((data, idx) => {
        if (!this.trs[idx]) this.addRaw()
        this.setRawData(idx, data || {})
      })
      // 分页刷新
      this.currentPage = 1
      this.refreshTbody()
    },
    addEmpty() {
      if (this.trs.length) this.trs.splice(0, this.trs.length)
      this.trs.push(this.emptyRule)
      this.refreshTbody()
    },
    clearEmpty() {
      if (this.trs[0] && this.trs[0]._isEmpty) this.trs.splice(0, 1)
    },
    delRaw(idx) {
      if (this.disabled || !this.deletable || (this.min > 0 && this.trs.length <= this.min)) return
      this.trs.splice(idx, 1)
      // 若删除后页码越界，自动回退一页
      const maxPage = Math.max(1, Math.ceil(this.dataRowCount / (this.pageSize || 10)))
      if (this.currentPage > maxPage) this.currentPage = maxPage
      this.updateValue()
      if (this.trs.length) {
        this.trs.forEach((tr) => this.updateRaw(tr))
      } else {
        this.addEmpty()
      }
      this.refreshTbody()
      this.$emit('delete', idx)
    },
    addRaw(flag) {
      if (flag && this.disabled) return
      const tr = this.formCreateInject.form.parseJson(this.copyTrs)[0]
      if (this.trs.length === 1 && this.trs[0]._isEmpty) this.trs.splice(0, 1)
      this.trs.push(tr)
      this.updateRaw(tr)
      if (flag) {
        this.$emit('add', this.trs.length)
        this.updateValue()
      }
      // 新增时若不在当前页，自动切到最后一页
      if (this.pagination) this.currentPage = Math.max(1, Math.ceil(this.dataRowCount / (this.pageSize || 10)))
      this.refreshTbody()
    },
    updateRaw(tr) {
      const idx = this.trs.indexOf(tr)
      tr.children[0].props.innerText = idx + 1
      tr.children[tr.children.length - 1].children[0].props.onClick = () => this.delRaw(idx)
    },
    handlePageChange(p) {
      this.currentPage = p
      this.refreshTbody()
    },
    loadRule() {
      const header = [
        { type: 'th', native: true, class: '_fc-tf-head-idx', props: { innerText: '#' } }
      ]
      const body = [
        { type: 'td', class: '_fc-tf-idx', native: true, props: { innerText: '0' } }
      ]
      this.columns.forEach((column) => {
        header.push({
          type: 'th',
          native: true,
          style: { ...(column.style || {}), textAlign: column.align || 'center' },
          class: column.required ? '_fc-tf-head-required' : '',
          props: { innerText: column.label || '' }
        })
        body.push({ type: 'td', native: true, children: [...(column.rule || [])] })
      })
      header.push({
        type: 'th',
        native: true,
        class: '_fc-tf-edit fc-clock',
        props: { innerText: this.formCreateInject.t('operation') || '操作' }
      })
      body.push({
        type: 'td',
        native: true,
        class: '_fc-tf-btn fc-clock',
        children: [{ type: 'i', native: true, class: 'fc-icon icon-delete', props: {} }]
      })
      this.copyTrs = this.formCreateInject.form.toJson([
        { type: 'tr', native: true, subRule: true, children: body }
      ])
      this.rule = [
        {
          type: 'table',
          native: true,
          class: '_fc-tf-table',
          props: { border: '1', cellspacing: '0', cellpadding: '0' },
          children: [
            { type: 'thead', native: true, children: [{ type: 'tr', native: true, children: header }] },
            { type: 'tbody', native: true, children: this.pageTrs }
          ]
        }
      ]
    }
  }
}
</script>

<style>
._fc-table-form {
  overflow: auto;
  color: #666666;
}

._fc-table-form .form-create td .el-form-item {
  margin-bottom: 1px;
}

._fc-table-form .form-create td .el-form-item.is-error {
  margin-bottom: 22px;
}

._fc-table-form .el-form-item__label,
._fc-table-form .van-field__label {
  display: none !important;
}

._fc-table-form .el-form-item__content {
  display: flex;
  margin-left: 0px !important;
  width: 100% !important;
}

._fc-tf-head-idx,
._fc-tf-idx {
  width: 40px;
  min-width: 40px;
  font-weight: 500;
  text-align: center;
}

._fc-tf-edit,
._fc-tf-btn {
  width: 70px;
  min-width: 70px;
  text-align: center;
}

._fc-tf-btn .fc-icon {
  cursor: pointer;
}

._fc-table-form._fc-disabled ._fc-tf-btn .fc-icon,
._fc-table-form._fc-disabled > .el-button {
  cursor: not-allowed;
}

._fc-tf-table {
  width: 100%;
  height: 100%;
  overflow: hidden;
  table-layout: fixed;
  border: 1px solid #EBEEF5;
  border-bottom: 0 none;
}

._fc-table-form ._fc-tf-table > thead > tr > th {
  border: 0 none;
  border-bottom: 1px solid #EBEEF5;
  height: 40px;
  font-weight: 500;
  padding: 0 5px;
  box-sizing: border-box;
}

._fc-table-form ._fc-tf-table > thead > tr > th + th {
  border-left: 1px solid #EBEEF5;
}

._fc-table-form tr {
  min-height: 50px;
}

._fc-table-form ._fc-read-view {
  text-align: center;
  width: 100%;
}

._fc-table-form td {
  padding: 5px;
  min-height: 50px;
  min-width: 80px;
  position: relative;
  box-sizing: border-box;
  overflow-wrap: break-word;
  /*white-space: nowrap;*/
  overflow: hidden;
  border: 0 none;
  border-bottom: 1px solid #EBEEF5;
}

._fc-table-form td + td {
  border-left: 1px solid #EBEEF5;
}

._fc-tf-table .el-input-number,
._fc-tf-table .el-select,
._fc-tf-table .el-slider,
._fc-tf-table .el-cascader,
._fc-tf-table .el-date-editor {
  width: 100%;
}

._fc-tf-head-required:before {
  content: '*';
  color: #f56c6c;
  margin-right: 4px;
}

.tf-pro-pagination {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
}
</style>
