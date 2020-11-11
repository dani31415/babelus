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
    }
];

let ignoreModules = [ '@angular/material/dialog', '@angular/cdk/drag-drop' ];

let moduleReplace : pr.ModuleReplace[] = [
    {
        pattern:'@angular/forms',
        name:'./forms',
        file:'./forms.ts',
        symbolRename: [['FormControl', 'FormCtrl']]
    }
]

export class MaterialFeature implements Feature {
    constructor() {
    }
    analysis(node : ts.Node, context: pr.Context, program: pr.Program) : ts.Node {
        // A way to initialize
        if (ts.isSourceFile) {
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