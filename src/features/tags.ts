import * as ts from 'typescript';

import * as pr from '../program';
import { Feature } from "./feature";
import * as helper from "../helper";
import { MapArray } from '../lib/maparray';

function matchSelector(selector:string, node:ts.Node) {
    let elem : ts.JsxSelfClosingElement | ts.JsxOpeningElement
    if (ts.isJsxSelfClosingElement(node)) {
        elem = node;
    }
    if (ts.isJsxElement(node)) {
        elem = node.openingElement;
    }
    if (elem) {
        if (ts.isIdentifier(elem.tagName)) {
            let text = helper.getText(elem.tagName);
            if (text==selector) return true;
            for (let attribute of elem.attributes.properties) {
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
                // [..., selfClosingElement, attributes] | [..., element, openingElement, attributes] 
                let parent = context.ancestors[context.ancestors.length-2]; 
                if (parent.kind!=ts.SyntaxKind.JsxSelfClosingElement) {
                    parent = context.ancestors[context.ancestors.length-3]; 
                }
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
                        let moduleName = helper.relativeToCurrentFile(context, program, module.name);
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
                if (foundRule.translate==null) return null; // remove attribute
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
                    let moduleName = helper.relativeToCurrentFile(context, program, foundRule.importsTop);
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
                    let moduleName = helper.relativeToCurrentFile(context, program, foundRule.imports);
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