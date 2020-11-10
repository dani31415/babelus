import * as ts from 'typescript';
import path from 'path';

import { Html } from '../html';
import * as pr from '../program';
import { Feature } from "./feature";
import * as helper from "../helper";

class TemplateResult {
    templateUrl?:string;
    selector?:string;
}

function capitalizeName( name : string ) {
    if (name.length==0) return name;
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function capitalizeSelector( className : string ) {
    let parts = className.split('-');
    parts = parts.map( capitalizeName );
    return parts.join('');
}

function render(factory : ts.NodeFactory, expr : ts.Expression) : ts.ClassElement {
    let returnStatment = factory.createReturnStatement(expr);
    let statements = [
        returnStatment
    ]
    let block = factory.createBlock(statements, true);
    let parameters : ts.ParameterDeclaration[];
    parameters = [];
    return factory.createMethodDeclaration(null,null,undefined,'render',undefined,null,parameters,null,block);
}

function findTemplate(clazz: ts.ClassDeclaration, context: pr.Context) : TemplateResult {
    if (clazz.decorators) {
        for (let decorator of clazz.decorators) {
            if (decorator.expression.kind == ts.SyntaxKind.CallExpression) {
                let callExpression = decorator.expression as ts.CallExpression;
                let func = callExpression.expression;
                if (func.kind == ts.SyntaxKind.Identifier) {
                    let identifier = func as ts.Identifier;
                    if (identifier.text == 'Component') {
                        //console.log('Component found');
                        if (callExpression.arguments.length>0) {
                            if (callExpression.arguments[0].kind!=ts.SyntaxKind.ObjectLiteralExpression) {
                                throw "Expected ObjectLiteralExpression";
                            }
                            let result : TemplateResult;
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

/**
 * Translates templates to jsx (ts.JsxChild)
 * Removes @Component decorator.
 */
export class ComponentFeature implements Feature {
    constructor(private html: Html) {
    }
    analysis(node : ts.Node, context: pr.Context, program: pr.Program) : ts.Node {
        if (ts.isClassDeclaration(node)) {
            let templateResult = findTemplate(node, context);
            if (templateResult) {
                context.currentClass.isComponent = true;
                context.currentClass.selector = templateResult.selector;
                context.currentClass.templateUrl = templateResult.templateUrl;
                let templateExpr : ts.Expression; // hp.ParseTreeResult;
                templateExpr = this.html.translateTemplate(context.factory, templateResult.templateUrl);
                let newMember = render(context.factory, templateExpr);
                let newMembers = context.factory.createNodeArray<ts.ClassElement>([...node.members, newMember]);
                let newClassName = capitalizeSelector( templateResult.selector );
                let newClassNameNode = context.factory.createIdentifier( newClassName );
                let className = node.name.getText();
                // Rename
                context.currentClass.name = newClassName;
                program.classRename.set(className, newClassName);
                program.requireClasses.push(newClassName);

                context.sourceFile.importsTop.push(['react','React']);
                let react = context.factory.createIdentifier('React');
                let component = context.factory.createIdentifier('Component');
                let reactComponent = context.factory.createPropertyAccessExpression(react,component);
                let type = context.factory.createExpressionWithTypeArguments(reactComponent, undefined);
                let clause = context.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [type]);
                let heritageClauses = node.heritageClauses || [];
                heritageClauses = [clause,...heritageClauses];

                return context.factory.updateClassDeclaration(
                    node,
                    node.decorators, 
                    node.modifiers, 
                    newClassNameNode,  // name
                    node.typeParameters, 
                    heritageClauses,
                    newMembers
                );
            }
        }
        if (ts.isDecorator(node)) {
            if (node.parent.kind == ts.SyntaxKind.ClassDeclaration) {
                if (ts.isCallExpression(node.expression))  {
                    let identifier = node.expression.expression;
                    if (ts.isIdentifier(identifier)) {
                        if (identifier.text == 'Component') {
                            return null; // remove decorator
                        }
                    }
                }
            }
        }
        return node;
    }

    declarations(node : ts.Node, context: pr.Context, program: pr.Program) : ts.Node {
        // Replace tag by classname and add import
        if (ts.isJsxOpeningElement(node)) {
            let tagName = helper.getText(node.tagName);
            let clazz = program.findClassBySelector(tagName);
            if (clazz!=null) {
                let sourceFile = program.findSourceFileByClassName(clazz.name);
                context.sourceFile.imports.add(sourceFile.sourceFile.fileName, clazz.name);
                return context.factory.updateJsxOpeningElement(
                    node,
                    context.factory.createIdentifier(clazz.name),
                    node.typeArguments,
                    node.attributes
                )
            }
        }
        // Replace tag by classname
        if (ts.isJsxClosingElement(node)) {
            let closingElement = node as ts.JsxClosingElement;
            let tagName = helper.getText(closingElement.tagName);
            let clazz = program.findClassBySelector(tagName);
            if (clazz!=null) {
                return context.factory.updateJsxClosingElement(
                    node,
                    context.factory.createIdentifier(clazz.name)
                )
            }
        }
        return node;
    }
}