import * as ts from 'typescript';
import path from 'path';

import * as pr from '../program';
import { Feature } from "./feature";
import * as helper from "../helper";

let rules = [
    {
        selector:'ckeditor',
        translate:'CKEditor',
        imports:'@ckeditor/ckeditor5-react'
    },
    {
        parentSelector:'ckeditor',
        selector:'@change',
        translate:'onChange'
    }
];

let ignoreModules = [  ];

let moduleReplace : pr.ModuleReplace[] = [
    {
        pattern:'@ckeditor/ckeditor5-angular/ckeditor.component',
        name:'@ckeditor/ckeditor5-react',
        //file:'./ckeditor.ts',
        symbolRename: []
    },
    {
        pattern:'@ckeditor/ckeditor5-angular',
        name:'@ckeditor/ckeditor5-react',
        symbolRename: []
    }
]

let moduleProvides = []

export class CkEditorFeature implements Feature {
    constructor() {
    }
    analysis(node : ts.Node, context: pr.Context, program: pr.Program) : ts.Node {
        // A way to initialize
        if (ts.isSourceFile(node)) {
            program.ignoreModules = program.ignoreModules.concat(ignoreModules);
            program.moduleReplace = program.moduleReplace.concat(moduleReplace);
            program.tagRules = program.tagRules.concat(rules);
            program.moduleProvides = program.moduleProvides.concat(moduleProvides);
        }
        return node;
    }

    declarations(node : ts.Node, context: pr.Context, program: pr.Program) : ts.Node {
        if (ts.isJsxOpeningElement(node)) {
            let attributes = [];
            if (ts.isIdentifier(node.tagName) && node.tagName.text=='ckeditor') {
                for (let attribute of node.attributes.properties) {
                    let newAttribute = attribute;
                    if (ts.isIdentifier(attribute.name)) {
                        if (attribute.name.text.startsWith('on')) {
                            if (ts.isJsxAttribute(attribute) && 
                            ts.isJsxExpression(attribute.initializer) &&
                            ts.isArrowFunction(attribute.initializer.expression) &&
                            ts.isCallExpression(attribute.initializer.expression.body)
                            ) {
                                // Change 
                                //   $event => this.f($event)
                                // into
                                //   ($event,editor) => this.f($event,editor)
                                //
                                // 1. Add parameter 'editor'
                                let af = attribute.initializer.expression;
                                let parameter = context.factory.createParameterDeclaration(undefined, undefined,undefined,'editor',undefined,undefined,undefined);
                                let params = [...af.parameters, parameter];
                                // 2. Add argument 'editor'
                                let c = attribute.initializer.expression.body;
                                let editor = context.factory.createIdentifier('editor');
                                let args = [...c.arguments, editor];
                                let call = context.factory.updateCallExpression(c, c.expression, undefined, args);
                                // 3. Build final expression
                                let arrow = context.factory.updateArrowFunction(af,af.modifiers,
                                    af.typeParameters,params,af.type,af.equalsGreaterThanToken,call);
                                let expression = context.factory.updateJsxExpression(attribute.initializer, arrow);
                                newAttribute = context.factory.updateJsxAttribute(attribute, attribute.name, expression);
                            }
                        }
                    }
                    attributes.push(newAttribute);
                }
                let nodeAttributes = context.factory.updateJsxAttributes(node.attributes, attributes);
                return context.factory.updateJsxOpeningElement(node, node.tagName, node.typeArguments, nodeAttributes);
            }
        }
        return node;
    }
}