import * as ts from 'typescript';
import path from 'path';

import * as pr from '../program';
import { Feature } from "./feature";
import * as helper from "../helper";

let rules = [
    {
        selector:'router-outlet',
        translate:'RouterOutlet',
        imports: './router'
    },
    {
        selector:'[mat-tab-link]',
        translate:'RouterLink',
        importsTop:'./router'
    },
    {
        selector:'@router-link',
        translate:'routerLink',
        parentSelector:'a'
    }
];

let ignoreModules = [  ];

let moduleReplace : pr.ModuleReplace[] = [
    {
        pattern:'@angular/router',
        name:'./router',
        file:'./router.ts',
        symbolRename: []
    }
]

// For exmaple, for
//   () => import('./task/task.module').then(m => m.TaskModule)
// returns 
//   {
//      module: TaskModule
//      fileModule: './task/task.module'
//   }
function findModuleLazyImport(context:pr.Context, node:ts.ArrowFunction) : {module:ts.Identifier,fileModule:string} {
    if (ts.isCallExpression(node.body) && 
    ts.isPropertyAccessExpression(node.body.expression) &&
    ts.isCallExpression(node.body.expression.expression)) {
        let argument = node.body.arguments[0];
        if (ts.isArrowFunction(argument) && 
        ts.isPropertyAccessExpression(argument.body)) {
            if (node.body.expression.expression.expression.kind==ts.SyntaxKind.ImportKeyword) {
                let fileModuleNode = node.body.expression.expression.arguments[0];
                if (ts.isStringLiteral(fileModuleNode) && ts.isIdentifier(argument.body.name)) {
                    let module = argument.body.name;
                    let fileModule = fileModuleNode.text;
                    return {module,fileModule}
                }
            }
        }
    }
}

export class AngularRouterFeature implements Feature {
    constructor() {
    }
    analysis(node : ts.Node, context: pr.Context, program: pr.Program) : ts.Node {
        // A way to initialize
        if (ts.isSourceFile(node)) {
            program.ignoreModules = program.ignoreModules.concat(ignoreModules);
            program.moduleReplace = program.moduleReplace.concat(moduleReplace);
            program.tagRules = program.tagRules.concat(rules);
        }
        if (ts.isArrowFunction(node)) {
            let result = findModuleLazyImport(context, node);
            if (result) {
                // Replace lazy module by actual children routes
                let {module,fileModule} = result;
                let ngModuleClass = helper.findClassByName(program, module.text);
                if (ngModuleClass) {
                    let res = helper.findImport(program, ngModuleClass, 'RouterModule.forChild');
                    if (res) {
                        let { ngModule, imp } = res;
                        let sourceFile = helper.findSourceFileByClassName(program, ngModule.name);
                        context.sourceFile.importsAll.push([sourceFile.sourceFile.fileName,ngModule.name]);
                        sourceFile.needsEmit = true;
                        return context.factory.createIdentifier(ngModule.name + '.routerModule.forChild');
                    }
                }
            }
        }

        return node;
    }

    declarations(node : ts.Node, context: pr.Context, program: pr.Program) : ts.Node {
        if (ts.isJsxOpeningElement(node)) {
            if (ts.isIdentifier(node.tagName)) {
                // Import the declaration of the routes
                if (node.tagName.text=='router-outlet') {
                    let { ngModule, imp } = helper.findNgModuleByComponentAndImport(program, context.currentClass, 'RouterModule.forRoot');
                    console.log("Found module for import:",ngModule.name,imp);
                    let sourceFile = helper.findSourceFileByClassName(program, ngModule.name);
                    context.sourceFile.imports.add(sourceFile.sourceFile.fileName,'routerModule');
                    sourceFile.needsEmit = true;
                    let routes = context.factory.createIdentifier('routes');
                    let routeModule = context.factory.createIdentifier('routerModule.forRoot');
                    let routeModuleExpr = context.factory.createJsxExpression(undefined, routeModule);
                    let attribute = context.factory.createJsxAttribute(routes,routeModuleExpr);
                    let attributes = context.factory.createJsxAttributes([attribute]); // ,...node.attributes.properties]);
                    return context.factory.updateJsxOpeningElement(node,node.tagName,undefined,attributes)
                }
            }
        }
        return node;
    }
}