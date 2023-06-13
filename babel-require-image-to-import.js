import * as t from '@babel/types'

export const defaultMetaType = [".jpg", ".jpeg", ".webp", ".svg", ".png", ".gif", ".avif"];
/**
 * 主要干两件事
 * 1 检查script中的require方法，如果有则直接写一个import，引入require-js中的require方法
 * 2 state中如果传入了对应的标识，则在data prop中引入一个transform require 方法
 * @returns {{name: string, visitor: {Program(*, *): void}}}
 */
export default function requireImgToImport() {
  return {
    name: "require-img-to-import",
    visitor: {
      Program(path, state) {
        let {enableInsertMixin} = state?.opts?.customPluginDynamicOpt
        let importedFlag = false
        const addRequireImport = () => {
          const importDefaultSpecifier = [
            t.importSpecifier(t.identifier('require'), t.identifier('require')),
            t.importSpecifier(t.identifier('transformRequire'), t.identifier('transformRequire')),
          ]
          const importDeclaration = t.importDeclaration(
            importDefaultSpecifier,
            t.stringLiteral('@/components/mixins/require-js')
          );
          path.get("body")[0] &&
          path.get("body")[0].insertBefore(importDeclaration);
          importedFlag = true
          console.dir('require&transformRequire in target script is supported')
        };
        const insert2ExistDataProp = (innerPath) => {
          let addFlag = false
          innerPath.traverse({
            ReturnStatement(innerPath) {
              if (!addFlag) {
                innerPath.node.argument.properties.push(t.objectProperty(
                    t.identifier('transformRequire'),
                    t.identifier('transformRequire')
                  )
                );
                addFlag = true;
              }
              else 
                return
            }
          })
          return addFlag
        }
        path.traverse({
          Identifier(path) {
            if(!enableInsertMixin)
              return
            else if (enableInsertMixin && path?.node?.name === 'data') {
              addRequireImport()
              if (insert2ExistDataProp(path.parentPath))
                console.dir('exist data find,insert executed...')
              else
                console.dir('data prop return statement not found,did u write or put it properly?')
              enableInsertMixin = false
            }
          },
          CallExpression(path) {
            if(importedFlag)
              return
            else if (
              !importedFlag &&
              path.node.callee.name === "require" &&
              path.node.arguments.length === 1
            ) {
              addRequireImport()
            }
          },
        });
      },
    },
  };
};
