import * as ts from 'typescript';
import path from 'path';

import * as pr from '../program';
import { Feature } from "./feature";
import * as helper from "../helper";

let rules = [
    {
        selector:'ckeditor',
        translate:'CkEditor',
        imports:'./ckeditor'
    }
];

let ignoreModules = [  ];

let moduleReplace : pr.ModuleReplace[] = [
    {
        pattern:'@ckeditor/ckeditor5-angular/ckeditor.component',
        name:'./ckeditor',
        file:'./ckeditor.ts',
        symbolRename: []
    },
    {
        pattern:'@ckeditor/ckeditor5-build-inline',
        name:'./ckeditor',
        file:'./ckeditor.ts',
        symbolRename: []
    }
]

export class CkEditorFeature implements Feature {
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