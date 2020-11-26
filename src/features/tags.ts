import * as ts from 'typescript';

import * as pr from '../program';
import { Feature } from "./feature";
import * as helper from "../helper";
import { MapArray } from '../lib/maparray';

let rules = [
    {
        selector:'@click',
        translate:'onClick'
    },
    {
        selector:'@keydown',
        translate:'onKeyDown'
    },
    {
        selector:'@input',
        translate:'onInput'
    }
];

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
        // A way to initialize
        if (ts.isSourceFile(node)) {
            program.tagRules = program.tagRules.concat(rules);
        }
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
        let foundRule : pr.TagRule;
        foundRule = findRuleMatch(context, program, node);
        if (foundRule)  {
            // Maybe add new imports
            helper.addImportTop(context, program, foundRule.translate, foundRule.importsTop);
            helper.addImports(context, program, foundRule.translate, foundRule.imports);

            let result = null;
            // Rename/remove attribute names
            if (ts.isJsxAttribute(node)) {
                if (foundRule.translate==null) {
                    // remove attribute
                } else {
                    let newName = context.factory.createIdentifier(foundRule.translate);
                    result = context.factory.updateJsxAttribute(node, newName, node.initializer);
                }
            }

            // Rename tags of self closing elements
            if (ts.isJsxSelfClosingElement(node) && foundRule.translate) {
                // Build updated jsxElement
                let newTagName = context.factory.createIdentifier(foundRule.translate);
                result = context.factory.updateJsxSelfClosingElement(node, newTagName, node.typeArguments, node.attributes);
            }

            // Rename tags of elements
            if (ts.isJsxElement(node) && foundRule.translate) {
                // Build updated jsxElement
                let newTagName = context.factory.createIdentifier(foundRule.translate);
                let openingElement = node.openingElement;
                let newOpeningElement = context.factory.updateJsxOpeningElement(openingElement,newTagName,undefined,openingElement.attributes);
                let newCloseningElement = context.factory.updateJsxClosingElement(node.closingElement, newTagName);
                result = context.factory.updateJsxElement(node, newOpeningElement, node.children, newCloseningElement);
            }

            if (foundRule.handler) {
                result = foundRule.handler(result, context, program);
            }

            return result;
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


