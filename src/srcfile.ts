import * as ts from 'typescript';

import { Program, SourceFile, Context } from './program';
import { Feature } from './features/feature';

const printer = ts.createPrinter();

export class SrcFile {
    public constructor() {
    }

    public show(node : ts.Node) {
        this.showImpl(node, 0, {items:0});
    }

    private showImpl(node : ts.Node, depth: number, counter:{items:number}) {
        let kind = node.kind;
        console.log(this.spaces(depth),ts.SyntaxKind[kind]+' ('+kind+') #'+counter.items);
        if (counter.items==29) {
            let k;
            k=33;
        }
        counter.items++;
        node.forEachChild<void>( (n:ts.Node) => {
            this.showImpl(n,depth+1,counter);
        });
    }

    private spaces(depth : number) {
        let s = '';
        for (let i=0;i<depth;i++) {
            s += ' ';
        }
        return s;
    }

    public analysis(sourceFile : SourceFile, program: Program, features: Feature[]) {
        let trans = (context:ts.TransformationContext) => {
            let processContext : Context = 
            {
                fileName: sourceFile.sourceFile.fileName,
                currentClass: null,
                sourceFile: sourceFile,
                factory: context.factory,
                transformationContext: context,
                ancestors: [],
                visit: node => {
                    for (let feature of features) {
                        if (node!==null) {
                            node = feature.analysis(node, processContext, program);
                        }
                    }
                    return node;
                }
            };
            return node => {
                return ts.visitNode(node, processContext.visit);
            }
        };
 
        let res = ts.transform(sourceFile.sourceFile, [ trans ]);
        sourceFile.sourceFile = res.transformed[0] as ts.SourceFile;
    }

    public declarations(sourceFile : SourceFile, program: Program, features: Feature[]) {
        let trans = (context:ts.TransformationContext) => {
            let processContext : Context = 
            {
                fileName: sourceFile.sourceFile.fileName,
                currentClass: null,
                sourceFile: sourceFile,
                factory: context.factory,
                transformationContext: context,
                ancestors: [],
                visit: node => {
                    for (let i=features.length-1;i>=0;i--) { // reverse iterate
                        let feature = features[i];
                        if (node!==null) {
                            node = feature.declarations(node, processContext, program);
                        }
                    }
                    return node;
                }
            };
            return node => {
                return ts.visitNode(node, processContext.visit);
            }
        };
 
        let res = ts.transform(sourceFile.sourceFile, [ trans ]);
        sourceFile.sourceFile = res.transformed[0] as ts.SourceFile;
    }

    public emit(node : ts.SourceFile) : string {
        let sourceString = printer.printNode(ts.EmitHint.SourceFile, node, node);
        return sourceString;
    }
}