import * as ts from 'typescript';
import path from 'path';

import * as pr from '../program';
import { Feature } from "./feature";
import * as helper from "../helper";

export class TagsFeature implements Feature {
    constructor() {
    }
    analysis(node : ts.Node, context: pr.Context, program: pr.Program) : ts.Node {
        // Replace Module
        if (ts.isImportDeclaration(node)) {
            if (ts.isStringLiteral(node.moduleSpecifier)) {
                let moduleName = node.moduleSpecifier.text;
                for (let module of program.moduleReplace) {
                    if (module.pattern == moduleName) {
                        let moduleName0 = path.join(program.srcDir, module.name);
                        //console.log(moduleName);
                        let moduleName = path.relative(path.dirname(context.fileName),moduleName0);
                        console.log(path.dirname(context.fileName),moduleName0,moduleName);
                        let newModule = context.factory.createStringLiteral(moduleName);
                        if (!program.assets.includes(module.file)) {
                            program.assets.push(module.file);
                        }
                        for (let symbolRename of module.symbolRename) {
                            program.classRename.set(symbolRename[0], symbolRename[1]);
                        }
                        return context.factory.updateImportDeclaration(
                            node,
                            node.decorators,
                            node.modifiers,
                            node.importClause,
                            newModule);
                    }
                }
            }
        }
        return node;
    }

    declarations(node : ts.Node, context: pr.Context, program: pr.Program) : ts.Node {
        // Rename open tags
        if (ts.isJsxOpeningElement(node)) {
            if (ts.isIdentifier(node.tagName)) {
                let text = helper.getText(node.tagName);
                for (let rule of program.tagRules) {
                    if (rule.selector == text) {
                        let newTagName = context.factory.createIdentifier(rule.translate);
                        if (rule.importsTop) {
                            context.sourceFile.importsTop.push([rule.importsTop,rule.translate]);
                        }
                        return context.factory.updateJsxOpeningElement(node,newTagName,undefined,node.attributes);
                    }
                }
            }
        }
        // Rename close tags
        if (ts.isJsxClosingElement(node)) {
            if (ts.isIdentifier(node.tagName)) {
                let text = helper.getText(node.tagName);
                for (let rule of program.tagRules) {
                    if (rule.selector == text) {
                        let newTagName = context.factory.createIdentifier(rule.translate);
                        return context.factory.updateJsxClosingElement(node,newTagName);
                    }
                }
            }
        }
        if (ts.isIdentifier(node)) {
            let text = helper.getText(node);
            let newText = program.classRename.get(text);
            if (newText!=null) {
                return context.factory.createIdentifier(newText);
            }
        }
        return node;
    }
}