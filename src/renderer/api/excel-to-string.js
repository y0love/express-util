'use strict'
const xlsx = require('xlsx')
const fs = require('fs')
const path = require('path')

const Trans = {
  conf: {excelPath: '', outPath: '', h5: false, ios: false, android: false},
  langs: {},
  log: null,
  innerProps: ['description', 'key', 'index', 'module', 'area', 'version'],
  message: (msg) => {
    if (Trans.log) {
      Trans.log(msg)
    } else {
      console.log('log:', msg)
    }

  },
  transAction: () => {
    if (!fs.existsSync(Trans.conf.excelPath)) {
      Trans.message('请选择Excel文件')
      return
    }
    if (!fs.existsSync(Trans.conf.outPath)) {
      Trans.message('请选择输出目录')
      return
    }

    var langs = Trans.transExcelFile(Trans.langs)
    // console.log('langs:', langs)
    if (Trans.conf.ios) {
      Trans.message('ios文案')
      Trans.makeiOSFile(langs)
    }
    if (Trans.conf.android) {
      Trans.message('android文案')
      Trans.makeAndroidFile(langs)
    }
    if (Trans.conf.h5) {
      Trans.message('h5文案')
      Trans.makeH5File(langs)
    }
  },
  getProp: (str = '') => {
    var strs = Trans.getProps(str)
    return strs[0] || null
  },
  getProps: function (str = '') {
    // 匹配 <xxx>
    var strs = str.match(/\<.*?(?=\>)/g)
    strs = strs.map(function (s) {
      return s.replace('<', '')
    })
    return strs
  },
  isInnerProp: function (str = '') {
    return Trans.innerProps.indexOf(str) >= 0
  },
  isRemarkProp: function (str = '') {
    return str.indexOf('_remark_') >= 0
  },
  getRemarkProp: function (str = '') {
    return str + '_remark_'
  },
  getLang: function (str = '', langs = null) {
    langs = langs || Trans.langs
    var lang = langs[str]
    if (!lang) {
      lang = {}
      langs[str] = lang
    }
    return lang
  },
  makeiOSFile: function (langs) {

    // iOS
    for (let langKey in langs) {
      let lang = langs[langKey]
      var desc = `/**\
          \niOS 语言文件, 该文件自动生成, 不建议手动修改\
          \n如有调整, 联系 @author\
          \n语言: ${lang[Trans.getRemarkProp('lang')]}\
          \n创建时间: ${new Date()}\
          \n*/\n\n`
      for (let key in lang) {
        let val = lang[key]

        if (Trans.isInnerProp(key) || Trans.isRemarkProp(key)) {
          continue
        }
        // 无交集 则跳过
        if (val.area.filter(v => ['all_native', 'all', 'ios'].includes(v)).length === 0) {
          continue
        }
        desc += `/// ${val.remark} \n`
        desc += `"${key}"="${val.value}";\n`
      }
      Trans.conf.desc += desc
      let aPath = path.join(Trans.conf.outPath, 'ios')
      if (!fs.existsSync(aPath)) {
        fs.mkdirSync(aPath)
      }
      if (fs.existsSync(aPath)) {
        fs.writeFileSync(path.join(aPath, langKey + '.strings'), desc)
      }
    }
  },
  makeAndroidFile: function (langs) {

    // Android
    for (let langKey in langs) {
      let lang = langs[langKey]

      var desc = '<?xml version="1.0" encoding="utf-8"?>'

      desc += '\n<!--Android 语言文件, 该文件自动生成, 不建议手动修改 -->'
      desc += '\n<!--如有调整, 联系 @author -->'
      desc += '\n<!--语言: ${lang[Trans.getRemarkProp(' + lang + ')]} -->'
      desc += '\n<!--创建时间: ' + new Date() + ' -->'
      desc += '\n<resources>\n'
      for (let key in lang) {
        let val = lang[key]

        if (Trans.isInnerProp(key) || Trans.isRemarkProp(key)) {
          continue
        }
        // 无交集 则跳过
        if (val.area.filter(v => ['all_native', 'all', 'android'].includes(v)).length === 0) {
          continue
        }
        desc += '\n  <!-- ' + val.remark + ' -->'
        desc += '\n  <string name="' + key + '">' + val.value + '</string>'
      }
      desc += '\n<resources>\n'
      Trans.conf.desc += desc

      let aPath = path.join(Trans.conf.outPath, 'android')
      if (!fs.existsSync(aPath)) {
        fs.mkdirSync(aPath)
      }
      if (fs.existsSync(aPath)) {
        fs.writeFileSync(path.join(aPath, 'string.' + langKey + '.xml'), desc)
      }
    }
  },
  makeH5File: function (langs) {

    // H5
    for (let langKey in langs) {
      let lang = langs[langKey]

      var desc = `# H5 语言文件, 该文件自动生成, 不建议手动修改\
          \n# 如有调整, 联系 @author\
          \n# 语言: ${lang[Trans.getRemarkProp('lang')]}\
          \n# 创建时间: ${new Date()}\
          \n\n`
      for (let key in lang) {
        let val = lang[key]
        if (Trans.isInnerProp(key) || Trans.isRemarkProp(key)) {
          continue
        }
        // 无交集 则跳过
        if (val.area.filter(v => ['all', 'h5'].includes(v)).length === 0) {
          continue
        }
        key = Trans.toHump(key)
        desc += `#  ${val.remark} \n`
        desc += `${key}: ${val.value}\n`
      }
      Trans.conf.desc += desc
      let aPath = path.join(Trans.conf.outPath, 'h5')
      if (!fs.existsSync(aPath)) {
        fs.mkdirSync(aPath)
      }
      if (fs.existsSync(aPath)) {
        fs.writeFileSync(path.join(aPath, langKey + '.yml'), desc)
      }
    }
  },
  // 下划线转换驼峰
  toHump: function (name) {
    return name.replace(/\_(\w)/g, function (all, letter) {
      return letter.toUpperCase();
    });
  },
  transExcelFile: function (langs) {
    //workbook 对象，指的是整份 Excel 文档。我们在使用 js-xlsx 读取 Excel 文档之后就会获得 workbook 对象。
    var workbook = xlsx.readFile(Trans.conf.excelPath)
    // 获取 Excel 中所有表名
    const sheetNames = workbook.SheetNames;
    // 根据表名获取对应某张表
    const worksheet = workbook.Sheets[sheetNames[0]];
    //返回json数据
    var datas = xlsx.utils.sheet_to_json(worksheet);

    // 先找到语言支持数量
    var newDatas = []
    for (let index in datas) {
      let line = datas[index]

      var data = {}
      newDatas.push(data)
      for (let fullkey in line) {
        let key = Trans.getProp(fullkey)
        let cnMark = fullkey.replace(`<${key}>`, '')
        data[key] = line[fullkey]
        data[Trans.getRemarkProp(key)] = cnMark
      }
    }

    // 生成语言包 excel 结构转换 [{一条多个国家的文案}] 转成 [{一个国家的多条文案}]
    for (let index in newDatas) {
      let line = newDatas[index]

      // 枚举一条文案的所有翻译
      for (let prop in line) {
        if (Trans.isInnerProp(prop) || Trans.isRemarkProp(prop)) {
          continue
        }
        var lang = Trans.getLang(prop, langs)
        lang[Trans.getRemarkProp('lang')] = line[prop + '_remark_']

        // 国际化文案域
        var area = line['area'] || ''
        area = area.replace(/[\ |\n]/g, '').split(',')
        area = area.filter(function (item) {
          return item.length > 0
        })
        // 添加国际化行
        lang[line['key']] = {
          key: line['key'],
          value: line[prop],
          remark: line['description'],
          area: area
        }
      }
    }
    return Trans.langs
  }
}

module.exports = Trans