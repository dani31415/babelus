import * as ts from 'typescript';
import path from 'path';

import { Html, HtmlContext } from '../html';
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

function normailizeAttribute( name:string) : string {
    let outName = '';
    for (let i=0;i<name.length;i++) {
        let c = name.charAt(i);
        if (c == c.toLowerCase()) {
            outName += c;
        } else {
            outName += '-'+c.toLowerCase();
        }
    }
    return outName;
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

function isMethod(variable:string, clazz: ts.ClassDeclaration) {
    for (let member of clazz.members) {
        if (ts.isMethodDeclaration(member)) {
            if (ts.isIdentifier(member.name)) {
                if (member.name.text==variable) {
                    return true;
                }
            }
        }
    }
    return false;
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

function findAsyncInit(node:ts.ClassDeclaration) {
    if (!node.members) return;
    for (let member of node.members) {
        if (ts.isMethodDeclaration(member)) {
            if (ts.isIdentifier(member.name)) {
                if (member.name.text=='ngOnInit' && member.modifiers) { // ngOnInit found
                    // Is async?
                    for (let modifier of member.modifiers) {
                        if (modifier.kind == ts.SyntaxKind.AsyncKeyword) {
                            return true;
                        }
                    }
                }
            }
        }
    }
    return false;
}

function findMethodByName(node:ts.ClassDeclaration, name:string) : ts.MethodDeclaration {
    if (!node.members) return;
    for (let member of node.members) {
        if (ts.isMethodDeclaration(member)) {
            if (ts.isIdentifier(member.name)) {
                if (member.name.text==name) return member;
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

                let newMembers = [...node.members];

                // Add render method
                let htmlContext = new HtmlContext();
                let templateExpr : ts.Expression; // hp.ParseTreeResult;
                templateExpr = this.html.translateTemplate(context.factory, templateResult.templateUrl, htmlContext);
                context.currentClass.boundMethods = context.currentClass.boundMethods.concat(htmlContext.boundVariables);
                let newMember = render(context.factory, templateExpr);
                newMembers.push(newMember);
                //let newMembers = context.factory.createNodeArray<ts.ClassElement>([...node.members, newMember]);

                // ngOnChanges
                if (findMethodByName(node,"ngOnChanges")!=null) {
                    let func = helper.createPropertyAccessor(context,['AngularUtils','callNgOnChanges']);
                    let statment = helper.createCall(context.factory,func,['this', 'prevProps', 'prevState']);
                    // AngularUtils.callNgOnChanges(this,prevProps,prevState);
                    newMembers.push(helper.newMethod(context.factory,'componentDidUpdate',['prevProps','prevState'],[statment]));
                    context.sourceFile.imports.add( helper.relativeToCurrentFile(context, program, './angular-utils'), 'AngularUtils');
                    program.assets.push('./angular-utils');
                }

                // Check async init
                context.currentClass.hasAsyncInit = findAsyncInit(node);

                // Rename class
                let newClassName = capitalizeSelector( templateResult.selector );
                let newClassNameNode = context.factory.createIdentifier( newClassName );
                let className = node.name.getText();
                context.currentClass.name = newClassName;
                program.classRename.set(className, newClassName);
                program.requireClasses.push(newClassName);

                // Add extends React.Component
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
        // Replace class --> className
        if (ts.isJsxAttribute(node)) {
            let attrName = helper.getText(node.name);
            if(attrName=='class') {
                let className = context.factory.createIdentifier('className');
                return context.factory.updateJsxAttribute(node,className,node.initializer);
            }
            if(attrName=='contenteditable') {
                let className = context.factory.createIdentifier('contentEditable');
                return context.factory.updateJsxAttribute(node,className,node.initializer);
            }
        }

        if (ts.isConstructorDeclaration(node)) {
            // Add async initialization
            if (context.currentClass.boundMethods.length>0) {
                let nodeClass : ts.ClassDeclaration;
                let toBeBound = [];
                if (ts.isClassDeclaration(node.parent)) {
                    nodeClass = node.parent;
                }
                for (let variable of context.currentClass.boundMethods) {
                    if (isMethod(variable, nodeClass)) {
                        toBeBound.push(variable);
                    }
                }

                if (toBeBound.length>0) {
                    // Add bind to variables in constructor
                    //  this.variable = this.variable.bind(this);
                    throw "Not implemented yet!";
                }
            }
            if (context.currentClass.hasAsyncInit) {
                // this.ngOnInit().then ( _ => this.setState({}));
                let thisToken = context.factory.createToken(ts.SyntaxKind.ThisKeyword);
                let thisNgOnInit = context.factory.createPropertyAccessExpression(thisToken,'ngOnInit');
                let thisNgOnInitApply = context.factory.createCallExpression(thisNgOnInit,undefined,[]);
                let then = context.factory.createPropertyAccessExpression(thisNgOnInitApply, 'then');
                let thisSetState = context.factory.createPropertyAccessExpression(thisToken,'setState');
                //let nullToken = context.factory.createToken(ts.SyntaxKind.NullKeyword);
                let emptyObject = context.factory.createObjectLiteralExpression([]);
                let thisSetStateApply = context.factory.createCallExpression(thisSetState,undefined,[emptyObject]);
                let egtt = context.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken);
                let map = context.factory.createArrowFunction(undefined,[],undefined,undefined,egtt,thisSetStateApply);
                let update = context.factory.createCallExpression(then, undefined, [map]);
                let updateStatement = context.factory.createExpressionStatement(update);
                let newStatements : ts.Statement[] = [...node.body.statements,updateStatement];
                let newBody = context.factory.updateBlock(node.body,newStatements);
                return context.factory.updateConstructorDeclaration(node,node.decorators,node.modifiers,node.parameters,newBody);
            }
        }
        // Remove .emit
        //    f.emit(x)  -->  f(x)
        if (ts.isPropertyAccessExpression(node)) {
            if (ts.isIdentifier(node.name)) {
                if (node.name.text=='emit') {
                    return node.expression;
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