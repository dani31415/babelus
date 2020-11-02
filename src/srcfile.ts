import * as ts from 'typescript';
import * as hp from '@angular/compiler/src/ml_parser/html_parser';
import * as dom from '@angular/compiler/src/ml_parser/ast';
import * as path from 'path';

// @angular/compiler @angular/compiler-cli
import * as angular from '@angular/compiler';
import * as r3_template from '@angular/compiler/src/render3/view/template';
import * as r3_ast from '@angular/compiler/src/render3/r3_ast';
import { ParseError } from '@angular/compiler/src/parse_util';
import * as output_ast from '@angular/compiler/src/output/output_ast';
import * as translator from '@angular/compiler-cli/src/ngtsc/translator';

import { Html } from './html';

const printer = ts.createPrinter();

class Context {
    fileName:String
}

class ComponentDeclaration {
    selector?: string;
    templateUrl?: string;
}

export class SrcFile {
    private ignoreModules = [ '@angular/core' ]; 
    private classRename = new Map();

    public constructor(private html:Html) {
    }

    protected nodeString = {
        identifier: function (node : ts.Node) : string {
            if (node.kind != ts.SyntaxKind.Identifier) {
                throw "Expected an identifier";
            }
            let identifier = node as ts.Identifier;
            return identifier.text;
        }  
    };

    private capitalizeName( name : string ) {
        if (name.length==0) return name;
        return name.charAt(0).toUpperCase() + name.slice(1);
    }

    private capitalizeSelector( className : string ) {
        let parts = className.split('-');
        parts = parts.map( this.capitalizeName );
        return parts.join('');
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
        let b : r3_template.TemplateDefinitionBuilder;
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

    private findComponentDeclaration(clazz:ts.ClassDeclaration, factory:ts.NodeFactory, context:Context) : ComponentDeclaration {
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
                                let result : ComponentDeclaration;
                                result = {};
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
                                        result.templateUrl = htmlFile;
                                        //return this.html.translateTemplate(factory, htmlFile);
                                    }
                                    if (name=='selector') {
                                        if (property.initializer.kind!=ts.SyntaxKind.StringLiteral) {
                                            throw "Expected StringLiteral";
                                        }
                                        let stringLiteral = property.initializer as ts.StringLiteral;
                                        result.selector = stringLiteral.text;
                                    }
                                }

                                if (Object.keys(result).length>0) {
                                    return result;
                                }
                            }
                        }
                    }
                }
            }
        }
        return null;
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
                if (node.kind==ts.SyntaxKind.ImportDeclaration) {
                    let importDeclaration = node as ts.ImportDeclaration;
                    if (importDeclaration.moduleSpecifier.kind==ts.SyntaxKind.StringLiteral) {
                        let moduleSpecifier = importDeclaration.moduleSpecifier as ts.StringLiteral;
                        if (this.ignoreModules.includes(moduleSpecifier.text)) {
                            return null;
                        }
                    }
                }
                if (node.kind==ts.SyntaxKind.Decorator) {
                    if (node.parent.kind == ts.SyntaxKind.ClassDeclaration) {
                        let decorator = node as ts.Decorator;
                        if (decorator.expression.kind == ts.SyntaxKind.CallExpression)  {
                            let callExpression = decorator.expression as ts.CallExpression;
                            let func = callExpression.expression;
                            if (func.kind == ts.SyntaxKind.Identifier) {
                                let identifier = func as ts.Identifier;
                                if (identifier.text == 'Component') {
                                    return null;
                                }
                            }
                        }
                    }
                }
                if (node.kind==ts.SyntaxKind.ClassDeclaration) {
                    let clazz = node as ts.ClassDeclaration;
                    let componentDeclaration : ComponentDeclaration; // hp.ParseTreeResult;
                    componentDeclaration = this.findComponentDeclaration(clazz, context.factory, processContext);
                    if (componentDeclaration!=null) {
                        let templateExpr : ts.Expression; // hp.ParseTreeResult;
                        templateExpr = this.html.translateTemplate(context.factory, componentDeclaration.templateUrl);
                        let newMember = this.render(context.factory, templateExpr);
                        let newMembers = context.factory.createNodeArray<ts.ClassElement>([...clazz.members, newMember]);
                        let newClassName = this.capitalizeSelector( componentDeclaration.selector );
                        let newClassNameNode = context.factory.createIdentifier( newClassName );
                        let className = this.nodeString.identifier(clazz.name);
                        this.classRename.set(className, newClassName);

                        // extends React.Component
                        let react = context.factory.createIdentifier('React');
                        let component = context.factory.createIdentifier('Component');
                        let reactComponent = context.factory.createPropertyAccessExpression(react,component)
                        let classExpression = context.factory.createExpressionWithTypeArguments(reactComponent, undefined);
                        let heritageClause = context.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [classExpression] );
                        let heritageClauses;
                        if (clazz.heritageClauses) {
                            heritageClauses = context.factory.createNodeArray( [...clazz.heritageClauses, heritageClause] );
                        } else {
                            heritageClauses = context.factory.createNodeArray( [heritageClause] );
                        }
                        return context.factory.updateClassDeclaration(
                            clazz,
                            ts.visitNodes(clazz.decorators, visit, ts.isDecorator), 
                            ts.visitNodes(clazz.modifiers, visit, ts.isModifier), 
                            ts.visitNode(newClassNameNode, visit, ts.isIdentifier),  // name
                            ts.visitNodes(clazz.typeParameters, visit, ts.isTypeParameterDeclaration), 
                            ts.visitNodes(heritageClauses, visit, ts.isHeritageClause), 
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
        return "import React from 'react';\n" + sourceString;
    }
}