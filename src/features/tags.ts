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

function matchSelector(selector:string, node:ts.Node) {
    if (ts.isJsxElement(node)) {
        let openingElement = node.openingElement;
        if (ts.isIdentifier(openingElement.tagName)) {
            let text = helper.getText(openingElement.tagName);
            if (text==selector) return true;
            for (let attribute of openingElement.attributes.properties) {
                if (ts.isJsxAttribute(attribute)) {
                    let matchSelector = '[' + attribute.name.text + ']'
                    if (matchSelector == selector) return true;
                }
            }
        }
    }
    if (ts.isJsxAttribute(node)) {
        let matchSelector = '@' + node.name.text;
        if (matchSelector == selector) return true;
    }
    return false;
}

function findRuleMatch(context:pr.Context, program:pr.Program, node:ts.Node) : pr.TagRule {
    for (let rule of program.tagRules) {
        if (matchSelector(rule.selector, node)) {
            if (rule.parentSelector) {
                let parent = context.ancestors[context.ancestors.length-3]; // [..., element, openingElement, attributes]
                if (matchSelector(rule.parentSelector,parent)) {
                    return rule;
                }
                // continue search
            } else {
                return rule;
            }
        }
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
        // Rename tags of elements
        if (ts.isJsxAttribute(node)) {
            let foundRule : pr.TagRule;
            foundRule = findRuleMatch(context, program, node);
            if (foundRule)  {
                let newName = context.factory.createIdentifier(foundRule.translate);
                return context.factory.updateJsxAttribute(node, newName, node.initializer);
            }
        }
        if (ts.isJsxElement(node)) {
            let foundRule : pr.TagRule;
            foundRule = findRuleMatch(context, program, node);
            if (foundRule) {
                let newTagName = context.factory.createIdentifier(foundRule.translate);
                if (foundRule.importsTop) {
                    // Maybe add new imports
                    let moduleName = relativeToCurrentFile(context, program, foundRule.importsTop);
                    let importTop : [file:string,symbol:string] = [moduleName,foundRule.translate];
                    let found = false;
                    for (let it of context.sourceFile.importsTop) {
                        if (importTop[0] == it[0] && importTop[1]==it[1]) {
                            found = true;
                        }
                    }
                    if (!found) {
                        context.sourceFile.importsTop.push(importTop);
                    }
                }
                if (foundRule.imports) {
                    // Maybe add new imports
                    let moduleName = relativeToCurrentFile(context, program, foundRule.imports);
                    context.sourceFile.imports.add( moduleName, foundRule.translate );
                }
                let openingElement = node.openingElement;
                let newOpeningElement = context.factory.updateJsxOpeningElement(openingElement,newTagName,undefined,openingElement.attributes);
                let newCloseningElement = context.factory.updateJsxClosingElement(node.closingElement, newTagName);
                return context.factory.updateJsxElement(node, newOpeningElement, node.children, newCloseningElement);
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