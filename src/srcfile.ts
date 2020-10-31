import * as ts from 'typescript';
import * as hp from '@angular/compiler/src/ml_parser/html_parser';
import * as dom from '@angular/compiler/src/ml_parser/ast';
import * as path from 'path';

// @angular/compiler @angular/compiler-cli
import * as angular from '@angular/compiler';
import * as template from '@angular/compiler/src/render3/view/template';
import * as r3_ast from '@angular/compiler/src/render3/r3_ast';
import { ParseError } from '@angular/compiler/src/parse_util';
import * as output_ast from '@angular/compiler/src/output/output_ast';
import * as translator from '@angular/compiler-cli/src/ngtsc/translator';

import { Html } from './html';

const printer = ts.createPrinter();

class Context {
    fileName:String
}

export class SrcFile {
    public constructor(private html:Html) {
    }

    public justForCompilation(template : string) : ts.Expression {
        // 
        let output : {
            errors?: ParseError[];
            nodes: r3_ast.Node[];
            styleUrls: string[];
            styles: string[];
            ngContentSelectors: string[];
        };
        output = angular.parseTemplate(template,null,null); // string --> r3_ast.node[]
        let nodes : r3_ast.Node[];
        nodes = output.nodes;
        let b : template.TemplateDefinitionBuilder;
        let out : output_ast.FunctionExpr;
        out = b.buildTemplateFunction(output.nodes,[]); // r3_ast.node[] --> output_ast.FunctionExpr
        let expr : ts.Expression;
        expr = translator.translateExpression(out,null,null,null);
        return expr;
    }

    public show(node : ts.Node) {
        this.showImpl(node, 0, {items:0});
    }

    private createElement(factory: ts.NodeFactory, tagName: string, children: ts.JsxChild[]) : ts.JsxElement {
        let tag = factory.createIdentifier(tagName);
        let openDiv = factory.createJsxOpeningElement(tag,[], factory.createJsxAttributes([]));
        let closeDiv = factory.createJsxClosingElement(tag);
        let element = factory.createJsxElement(openDiv,children,closeDiv);
        return element;

    }

    public render(factory : ts.NodeFactory, expr : ts.Expression) : ts.ClassElement {
        let returnStatment = factory.createReturnStatement(expr);
        let statements = [
            returnStatment
        ]
        let block = factory.createBlock(statements, true);
        let parameters : ts.ParameterDeclaration[];
        parameters = [];
        return factory.createMethodDeclaration(null,null,undefined,'render',undefined,null,parameters,null,block);
    }

    private showImpl(node : ts.Node, depth: number, counter:{items:number}) {
        let kind = node.kind;
        console.log(this.spaces(depth),ts.SyntaxKind[kind]+' ('+kind+') #'+counter.items);
        if (counter.items==11) {
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
                this.show(clazz);
                for (let decorator of clazz.decorators) {
                    if (decorator.expression.kind == ts.SyntaxKind.CallExpression) {
                        let callExpression = decorator.expression as ts.CallExpression;
                        let func = callExpression.expression;
                        if (func.kind == ts.SyntaxKind.Identifier) {
                            let identifier = func as ts.Identifier;
                            if (identifier.text == 'Component') {
                                console.log('Component found');
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
                                            return htmlFile;
                                            //this.html.process(htmlFile);
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

    private findHtml(clazz:ts.ClassDeclaration, context:Context) {
        if (clazz.decorators) {
            this.show(clazz);
            for (let decorator of clazz.decorators) {
                if (decorator.expression.kind == ts.SyntaxKind.CallExpression) {
                    let callExpression = decorator.expression as ts.CallExpression;
                    let func = callExpression.expression;
                    if (func.kind == ts.SyntaxKind.Identifier) {
                        let identifier = func as ts.Identifier;
                        if (identifier.text == 'Component') {
                            console.log('Component found');
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
                                        // gntsc/partial_evaluator
                                        // this.evaluator.evaluate(relHtmlFile);
                                        let dir = path.dirname(context.fileName.toString());
                                        let htmlFile = path.join( dir, relHtmlFile);
                                        return this.html.process2(htmlFile);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return null;
    }

    public htmlToNode2(factory : ts.NodeFactory, node : ts.Expression) : ts.ClassElement {
        //let node = this.html.process2(templateFile);
        return this.render(factory, node);

    }

    public htmlToNode(factory : ts.NodeFactory, pts : hp.ParseTreeResult) : ts.ClassElement {
        console.log(pts.rootNodes);
        let visitor = {
            visitElement: function(element: dom.Element, factory: ts.NodeFactory) : any {
                console.log('elem',element.name);
                let tag = factory.createIdentifier(element.name);
                let openDiv = factory.createJsxOpeningElement(tag,[], factory.createJsxAttributes([]));
                let closeDiv = factory.createJsxClosingElement(tag);
                let children = dom.visitAll(visitor, element.children, factory);
                let jsxElement = factory.createJsxElement(openDiv,children,closeDiv);
                return jsxElement;
            },
            visitAttribute: function(attribute: dom.Attribute, context: any): any {
                console.log("Attribute");
            },
            visitText: function(text: dom.Text, factory: ts.NodeFactory): any {
                return factory.createJsxText(text.value);
            },
            visitComment: function(comment: dom.Comment, context: any): any {
                console.log("Comment");
            },
            visitExpansion: function(expansion: dom.Expansion, context: any): any {
                console.log("Expansion");
            },
            visitExpansionCase: function(expansionCase: dom.ExpansionCase, context: any): any {
                console.log("ExpansionCase");
            }
        };
        let nodes = dom.visitAll(visitor, pts.rootNodes, factory);
        let node : ts.Expression;
        if (nodes.length==1) {
            node = nodes[0];
        } else {
            node = this.createElement(factory, 'React.Fragment', nodes);
        }
        return this.render(factory, node);
        //return this.render(factory);
    }

    public process2(node : ts.SourceFile) : ts.SourceFile {
        let processContext : Context = 
        {
            fileName: node.fileName
        };

        //const source = program.getSourceFile(sf.fileName);
        let trans = (context:ts.TransformationContext) => {
            const visit: ts.Visitor = node => {
                if (node==null) return null;
                if (node.kind==ts.SyntaxKind.ClassDeclaration) {
                    let clazz = node as ts.ClassDeclaration;
                    let templateExpr : ts.Expression; // hp.ParseTreeResult;
                    //htmlResult = this.findHtml(clazz, processContext);
                    templateExpr = this.findHtml(clazz, processContext);
                    if (templateExpr!=null) {
                        let newMember = this.htmlToNode2(context.factory, templateExpr);
                        let newMembers = context.factory.createNodeArray<ts.ClassElement>([...clazz.members, newMember]);
                        let t : ts.UnparsedSourceText;
                        
                        return context.factory.updateClassDeclaration(
                            clazz, 
                            ts.visitNodes(clazz.decorators, visit, ts.isDecorator), 
                            ts.visitNodes(clazz.modifiers, visit, ts.isModifier), 
                            ts.visitNode(clazz.name, visit, ts.isIdentifier), 
                            ts.visitNodes(clazz.typeParameters, visit, ts.isTypeParameterDeclaration), 
                            ts.visitNodes(clazz.heritageClauses, visit, ts.isHeritageClause), 
                            ts.visitNodes(newMembers, visit, ts.isClassElement)
                        );
                    }
                }
                return ts.visitEachChild(node, visit, context);
            };
        
            return node => {
                return ts.visitNode(node, visit);
            }
        };

        let res = ts.transform(node, [ trans ]);
        return res.transformed[0] as ts.SourceFile;
        //let sourceString = printer.printNode(ts.EmitHint.SourceFile, res.transformed[0], sf)
    }

    public emit(node : ts.SourceFile) : string {
        let sourceString = printer.printNode(ts.EmitHint.SourceFile, node, node);
        return sourceString;
    }
}