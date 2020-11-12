import * as ts from 'typescript';
import path from 'path';

import * as pr from '../program';
import { Feature } from "./feature";
import * as helper from "../helper";
import { MapArray } from '../lib/maparray';

function relativeToCurrentFile(context: pr.Context, program: pr.Program, moduleName:string) : string {
    if (moduleName.charAt(0)=='.') {
        let moduleName0 = path.join(program.srcDir, moduleName);
        let moduleName1 = path.relative(path.dirname(context.fileName),moduleName0);
        if (!program.assets.includes(moduleName)) {
            program.assets.push(moduleName);
        }
        return moduleName1;
    } else {
        return moduleName;
    }
}

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
                        let moduleName = relativeToCurrentFile(context, program, module.name);
                        let newModule = context.factory.createStringLiteral(moduleName);
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
                            let moduleName = relativeToCurrentFile(context, program, rule.importsTop);
                            context.sourceFile.importsTop.push([moduleName,rule.translate]);
                        }
                        if (rule.imports) {
                            let moduleName = relativeToCurrentFile(context, program, rule.imports);
                            context.sourceFile.imports.add( moduleName, rule.translate );
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
        // Identifier rename
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