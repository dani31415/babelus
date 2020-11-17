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
        selector:'mat-hint',
        translate:'FormHelperText',
        importsTop:'@material-ui/core/FormHelperText'
    },
    {
        selector:'mat-error',
        translate:'FormHelperText',
        importsTop:'@material-ui/core/FormHelperText'
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

export class MaterialFeature implements Feature {
    constructor() {
    }
    analysis(node : ts.Node, context: pr.Context, program: pr.Program) : ts.Node {
        // A way to initialize
        if (ts.isSourceFile(node)) {
            program.ignoreModules = program.ignoreModules.concat(ignoreModules);
            program.moduleReplace = program.moduleReplace.concat(moduleReplace);
            program.tagRules = program.tagRules.concat(rules);
        }
        return node;
    }

    declarations(node : ts.Node, context: pr.Context, program: pr.Program) : ts.Node {
       return node;
    }
}