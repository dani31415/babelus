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
        importsTop:'@material-ui/core/Button'
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