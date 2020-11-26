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

let ignoreModules = [ ];

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
        provides: [ 'MatDialog', 'MatDialogRef' ]
    }
]

function handleImport(node : ts.Node, context: pr.Context, program: pr.Program) : ts.Node {
    if (ts.isJsxSelfClosingElement(node)) {
        let newAttributes = [];
        for (let attribute of node.attributes.properties) {
            let newAttribute = attribute;
            if (ts.isJsxAttribute(attribute) && ts.isIdentifier(attribute.name)) {
                if (attribute.name.text=='form-control' && ts.isJsxExpression(attribute.initializer)) {
                    let handleInputChange = context.factory.createPropertyAccessExpression(attribute.initializer.expression,'handleInputChange');
                    let onChangeIdent = context.factory.createIdentifier('onChange');
                    let jsxHandleInputChange = context.factory.createJsxExpression(undefined, handleInputChange);
                    let onChange = context.factory.createJsxAttribute(onChangeIdent, jsxHandleInputChange);
                    newAttributes.push(onChange)

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
                if (attribute.name.text=='click') {
                    return; // handles its own click
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