import * as ts from 'typescript';
import * as path from 'path';

import { Html } from './html';

class Context {
    fileName:String
}

export class SrcFile {
    public constructor(private html:Html) {

    }

    public show(node : ts.Node, depth: number) {
        let kind = node.kind;
        console.log(this.spaces(depth),ts.SyntaxKind[kind]+' ('+kind+')');
        node.forEachChild<void>( (n:ts.Node) => {
            this.show(n,depth+1);
        });
    }

    private spaces(depth : number) {
        let s = '';
        for (let i=0;i<depth;i++) {
            s += ' ';
        }
        return s;
    }

    public process(node : ts.SourceFile) {
        this.processNode(node,{
            fileName: node.fileName
        });
    }

    public processNode(node : ts.Node, context:Context) {
        if (node.kind == ts.SyntaxKind.ClassDeclaration) {
            let clazz : ts.ClassDeclaration;
            clazz = node as ts.ClassDeclaration;
            if (clazz.decorators) {
                console.log(Object.keys(clazz));
                for (let decorator of clazz.decorators) {
                    if (decorator.expression.kind == ts.SyntaxKind.CallExpression) {
                        let callExpression = decorator.expression as ts.CallExpression;
                        let func = callExpression.expression;
                        if (func.kind == ts.SyntaxKind.Identifier) {
                            let identifier = func as ts.Identifier;
                            if (identifier.text == 'Component') {
                                console.log('Component found');
                                this.show(callExpression,0);
                                if (callExpression.arguments.length>0) {
                                    if (callExpression.arguments[0].kind!=ts.SyntaxKind.ObjectLiteralExpression) {
                                        throw "Expected ObjectLiteralExpression";
                                    }
                                    let object = callExpression.arguments[0] as ts.ObjectLiteralExpression;
                                    for (let property of object.properties) {
                                        if (property.kind!=ts.SyntaxKind.PropertyAssignment) {
                                            throw "Expected PropertyAssignment";
                                        }
                                        if (property.name.kind!=ts.SyntaxKind.Identifier) {
                                            throw "Expected Identifier";
                                        }
                                        let name = property.name.escapedText;
                                        if (name=='templateUrl') {
                                            if (property.initializer.kind!=ts.SyntaxKind.StringLiteral) {
                                                throw "Expected StringLiteral";
                                            }
                                            // Get file name
                                            let stringLiteral = property.initializer as ts.StringLiteral;
                                            let relHtmlFile = stringLiteral.text;
                                            let dir = path.dirname(context.fileName.toString());
                                            let htmlFile = path.join( dir, relHtmlFile);
                                            this.html.process(htmlFile);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        node.forEachChild<void>( (n:ts.Node) => {
            this.processNode(n, context);
        });
    }
}