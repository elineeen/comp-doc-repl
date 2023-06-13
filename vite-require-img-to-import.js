import { Plugin } from "vite";
import requireImgToImport, { defaultMetaType } from "./babel-require-image-to-import";
import * as babel from "@babel/core";
const vueCompiler = require("@vue/compiler-sfc");babel-require-image-to-import.js

export default function vueImgPlugin(options={}){
  let {fileNameList}=options
  let customPluginDynamicOpt={
    enableInsertMixin:false
  }
  const fileNameStr=fileNameList.reduce((accum,current,idx)=>{
    let prefix=idx?'|':''
    return accum+prefix+current+'.vue'
  })
  const fileNameRegex=new RegExp(fileNameStr)
  const metaType = options?.metaType ? options?.metaType : defaultMetaType;
  const babelPlugins= [
    ["@babel/plugin-proposal-decorators", { "legacy": true }],
    [
      "@babel/plugin-proposal-class-properties",
      { loose: true },
    ],
    [requireImgToImport, { metaType,customPluginDynamicOpt }],

  ];
  function isMatchMeta(meta, metaType) {
    return metaType.some((type) => meta.endsWith(type));
  }
  function setAttr(params) {
    const flatAttrs = Object.entries(params?.attrs || {}).reduce((acc, [key, value]) => {
      return (acc += ` ${key}${value === true ? "" : `="${value}"`}`);
    }, "");
    return `<${params.type}${flatAttrs}>${params.children || ""}</${params.type
    }>`;
  }
  function getRequireFilePage(fileSrc,requireStr) {
    return requireStr.replace('require','transformRequire')
  }
  return {
    enforce:'pre',
    name: "vite-require-image-to-import:vue",
    async transform(code, id) {
      if (/node_modules/g.test(id) || code.indexOf('require(') === -1) return null;
      if (/\.vue$/.test(id)&&(fileNameRegex.test(id))) {
        console.dir(id)
        const parseResult = vueCompiler.parse(code);
        const descriptor = parseResult.descriptor;
        /**
         * 解析脚本使用了项目中babel配置，你需要用你对应项目的babel配置替换
         * @param scriptDescriptor
         * @returns {Promise<string|string>}
         */
        const handleScript = async (scriptDescriptor) => {
          if (!scriptDescriptor?.content) return '';
          const scriptResult = scriptDescriptor.content
            ? await babel.transformAsync(scriptDescriptor.content, {
              plugins:babelPlugins,
              presets: [
                [
                  '@vue/app',
                  {
                    polyfills: [
                      'es6.promise',
                      'es6.symbol',
                      'es6.array.find-index',
                      'es7.array.includes',
                      'es6.string.includes',
                      'es6.array.iterator',
                    ],
                  },
                ],
              ],
              sourceType: 'unambiguous',
              sourceFileName: id,
              filename: id,
            })
            : { code: '' };
          return scriptResult.code ? setAttr({
            type: "script",
            attrs: scriptDescriptor?.attrs,
            children: `\n${scriptResult.code}`,
        }) : '';
        };
        //替换了解析顺序，需要先解析template来确定是否需要插入mixin
        // 3. template 解析时把所有require替换为transformRequire，不知为何require接不到
        const templateResult = descriptor?.template?.content?.replace?.(
          /(require\(([^)]+)\))/g,
          (__, $1, $2) => {
            const replaceResult = getRequireFilePage(id,$1,$2)
            customPluginDynamicOpt.enableInsertMixin=true;
            return isMatchMeta($2.replace(/['"]/g, ""), metaType)
              ? `${replaceResult}`
              : $1;
          }
        );
        const templateTag = !templateResult ? '' : setAttr({
          type: "template",
          attrs: descriptor?.template?.attrs,
          children: templateResult,
      });

        // 1. scriptSetup
        const scriptSetupResultTag = await handleScript(descriptor?.scriptSetup);

        // 2. script script中插入对应支持
        const scriptResultTag = await handleScript(descriptor?.script);

        // 4. style
        const stylesTag = descriptor?.styles
          .map((styleDescriptor) =>
            setAttr({
              type: "style",
              attrs: styleDescriptor.attrs,
              children: styleDescriptor.content,
            })
          )
          .join("\n");
        // as we use it in vue 2.x so no need for adapting custom blocks
        const resultCode = [
          scriptSetupResultTag,
          scriptResultTag,
          templateTag,
          stylesTag,
        ].filter(Boolean).join("\n");

        return {
          code: resultCode,
        };
      }
      return null;
    },
  };

}
