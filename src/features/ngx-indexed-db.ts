import * as ts from 'typescript';
import path from 'path';

import * as pr from '../program';
import { Feature } from "./feature";
import * as helper from "../helper";

let rules = [];

let ignoreModules = [  ];

let moduleReplace : pr.ModuleReplace[] = [
    {
        pattern:'ngx-indexed-db',
        name:'./ngx-indexed-db',
        file:'./ngx-indexed-db.ts',
        symbolRename: []
    }
]

let moduleProvides = [
    {
        moduleMethod:'NgxIndexedDBModule.forRoot',
        provides:['NgxIndexedDBService']
    }
];

export class NgxIndexedDbFeature implements Feature {
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