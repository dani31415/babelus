import * as ts from 'typescript';
import path from 'path';

import * as pr from '../program';
import { Feature } from "./feature";
import * as helper from "../helper";

let rules = [
    {
        selector:'mat-icon',
        translate:'Icon',
        importsTop: '@material-ui/core/Icon'
    },
    {
        selector:'mat-form-field',
        translate:'FormControl',
        importsTop: '@material-ui/core/FormControl'
    },
    {
        selector:'mat-label',
        translate:'InputLabel',
        importsTop:'@material-ui/core/InputLabel'
    },
    {
        selector:'mat-card',
        translate:'Card',
        handler:handleCard,
        importsTop:'@material-ui/core/Card'
    },
    {
        parentSelector:'mat-card',
        selector:'@routerLink',
        translate:'router-link'
    },
    {
        selector:'mat-hint',
        translate:'FormHelperText',
        importsTop:'@material-ui/core/FormHelperText'
    },
    {
        selector:'mat-error',
        translate:'FormHelperText',
        importsTop:'@material-ui/core/FormHelperText'
    },
    {
        selector:'button',
        translate:'Button',
        handler:handleButton,
        importsTop:'@material-ui/core/Button'
    },
    {
        selector:'input',
        translate:'Input',
        handler:handleImport,
        importsTop:'@material-ui/core/Input'
    },
    {
        parentSelector:'button',
        selector:'@routerLink',
        translate:'href'
    },
    {
        parentSelector:'button',
        selector:'@color',
        translate:null // remove
    },
    {
        parentSelector:'input',
        selector:'@matInput',
        translate:'mat-input'
    },
    {
        parentSelector:'input',
        selector:'@formControl',
        translate:'form-control'
    },
    {
        parentSelector:'form',
        selector:'@formGroup',
        translate:'form-group'
    },
    {
        parentSelector:'nav',
        selector:'@backgroundColor',
        translate:'color'
    },
    {
        selector:'@cdkDropList',
        translate:'cdk-drop-list'
    },
    {
        selector:'@cdkDropListDropped',
        translate:'cdk-drop-list-dropped'
    },
    {
        selector:'@cdkDrag',
        translate:'cdk-drag'
    }
];

let ignoreModules = [ '@angular/material/dialog' ];

let moduleReplace : pr.ModuleReplace[] = [
    {
        pattern:'@angular/forms',
        name:'./forms',
        file:'./forms.ts',
        symbolRename: [['FormControl', 'FormCtrl']]
    },
    {
        pattern:'@angular/material/dialog',
        name:'./material',
        file:'./material.ts',
        symbolRename: []
    },
    {
        pattern:'@angular/cdk/drag-drop',
        name:'./drag-drop',
        file:'./drag-drop.ts',
        symbolRename: [ ['CdkDragDrop', 'DragDropEvent'] ]
    }
]

let moduleProvides = [
    {
        module: './material',
        provides: [ 'MatDialog', 'MatDialogRef', 'MatDialogData' ]
    }
]

function handleImport(node : ts.Node, context: pr.Context, program: pr.Program) : ts.Node {
    if (ts.isJsxSelfClosingElement(node)) {
        let newAttributes = [];
        for (let attribute of node.attributes.properties) {
            let newAttribute = attribute;
            if (ts.isJsxAttribute(attribute) && ts.isIdentifier(attribute.name)) {
                if (attribute.name.text=='form-control' && ts.isJsxExpression(attribute.initializer)) {
                    // onChange={event => [attribute.initializer] .handleInputChange(event,this)}
                    let handleInputChange = context.factory.createPropertyAccessExpression(attribute.initializer.expression,'handleInputChange');
                    let call = helper.createCall(context.factory, handleInputChange, ['event','this']);
                    let arrowFunc = helper.createArrowFunction(context.factory, ['event'], call);
                    let onChangeIdent = context.factory.createIdentifier('onChange');
                    let jsxHandleInputChange = context.factory.createJsxExpression(undefined, arrowFunc);
                    let onChange = context.factory.createJsxAttribute(onChangeIdent, jsxHandleInputChange);
                    newAttributes.push(onChange)

                    // value={ [attribute.initializer] .value}
                    let value = context.factory.createPropertyAccessExpression(attribute.initializer.expression,'value');
                    let valueIdent = context.factory.createIdentifier('value');
                    let valueJsx = context.factory.createJsxExpression(undefined, value);
                    let valueAttr = context.factory.createJsxAttribute(valueIdent, valueJsx);
                    newAttributes.push(valueAttr)

                    newAttribute = null;
                }
            }
            if (newAttribute) newAttributes.push(newAttribute)
        }

        let attributesNode = context.factory.updateJsxAttributes(node.attributes, newAttributes);
        return context.factory.updateJsxSelfClosingElement(node, node.tagName, node.typeArguments, attributesNode);
    }
}

function handleButton(node : ts.Node, context: pr.Context, program: pr.Program) : ts.Node {
    if (ts.isJsxElement(node)) {
        let attributes = node.openingElement.attributes;
        for (let attribute of attributes.properties) {
            if (ts.isJsxAttribute(attribute) && ts.isIdentifier(attribute.name)) {
                if (attribute.name.text=='onClick') {
                    return node; // handles its own click
                }
            }
        }
        // Add type='submit'
        let value = context.factory.createStringLiteral('submit');
        let valueIdent = context.factory.createIdentifier('type');
        let valueAttr = context.factory.createJsxAttribute(valueIdent, value);
        let newAttributes = [valueAttr,...attributes.properties];

        let attributesNode = context.factory.updateJsxAttributes(attributes, newAttributes);
        let openingElement = context.factory.updateJsxOpeningElement(node.openingElement, 
            node.openingElement.tagName, node.openingElement.typeArguments, attributesNode);
        return context.factory.createJsxElement(openingElement, node.children, node.closingElement);
    }
}

function handleCard(node : ts.Node, context: pr.Context, program: pr.Program) : ts.Node {
    if (ts.isJsxElement(node)) {
        let attributes = node.openingElement.attributes;
        for (let attribute of attributes.properties) {
            if (ts.isJsxAttribute(attribute) && ts.isIdentifier(attribute.name)) {
                // If router-link, add CardActionArea that points to the same link
                if (attribute.name.text=='router-link') {
                    // 1. Remove attribute
                    // 2. Add <CardActionArea>
                    // <CardActionArea onClick={router.navigatorByUrl( [attribute.initializer] )}> ...
                    let func = helper.createPropertyAccessor(context, ['router','navigatorByUrl']);
                    let expr = helper.createCall(context.factory, func, [ attribute.initializer ]);
                    let jsxExpr = context.factory.createJsxExpression(undefined, expr);
                    let cardActionArea = helper.createJsxElement(
                        context.factory,
                        'CardActionArea',
                        //'Link',
                        {
                            //href:attribute.initializer
                            //to:attribute.initializer
                            onClick:jsxExpr
                        },
                        null,
                        [...node.children]
                    )
                    // 3. Add imports
                    let module = helper.relativeToCurrentFile(context, program, './router');
                    context.sourceFile.imports.add(module,'router');
                    context.sourceFile.importsTop.push(['@material-ui/core/CardActionArea','CardActionArea']);
                    //context.sourceFile.imports.add('react-router-dom','Link');
                    return context.factory.updateJsxElement(node, node.openingElement, [cardActionArea], node.closingElement);
                }
            }
        }
    }
    return node;
}

export class MaterialFeature implements Feature {
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
       return node;
    }
}