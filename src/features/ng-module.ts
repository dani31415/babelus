import * as ts from 'typescript';
import path from 'path';

import * as pr from '../program';
import { Feature } from "./feature";
import * as helper from "../helper";

function descapitalizeName( name : string ) {
    if (name.length==0) return name;
    return name.charAt(0).toLowerCase() + name.slice(1);
}

class NgModuleResult {
    public imports: pr.NgModuleImport[] = [];
    public declarations: string[] = [];
}

function findModule(node:ts.ClassDeclaration, context:pr.Context, program:pr.Program) {
    if (node.decorators) {
        for (let decorator of node.decorators) {
            if (ts.isCallExpression(decorator.expression)) {
                if (ts.isIdentifier(decorator.expression.expression)) {
                    if (decorator.expression.expression.text == 'NgModule') {
                        let result = new NgModuleResult();
                        //console.log('Component found');
                        if (decorator.expression.arguments.length>0) {
                            let argument = decorator.expression.arguments[0];
                            if (ts.isObjectLiteralExpression(argument)) {
                                for (let property of argument.properties) {
                                    if (ts.isPropertyAssignment(property)) {
                                        if (ts.isIdentifier(property.name)) {
                                            if (property.name.text=='imports') {
                                                // Add forRoot imports
                                                if (ts.isArrayLiteralExpression(property.initializer)) {
                                                    for (let element of property.initializer.elements) {
                                                        if (ts.isIdentifier(element)) {
                                                            result.imports.push({
                                                                name:element.text,
                                                                provides:helper.getProvidesFromModule(program,element.text),
                                                                original:element
                                                            });
                                                        }
                                                        if (ts.isCallExpression(element)) {
                                                            if (ts.isPropertyAccessExpression(element.expression)) {
                                                                if (ts.isIdentifier(element.expression.expression) && ts.isIdentifier(element.expression.name)) {
                                                                    let module = element.expression.expression.text;
                                                                    let method = element.expression.name.text;
                                                                    result.imports.push({
                                                                        name:module+'.'+method,
                                                                        provides:helper.getProvidesFromModule(program,module+'.'+method),
                                                                        original:element
                                                                    });                               
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                            if (property.name.text=='declarations') {
                                                // Add forRoot imports
                                                if (ts.isArrayLiteralExpression(property.initializer)) {
                                                    for (let element of property.initializer.elements) {
                                                        if (ts.isIdentifier(element)) {
                                                            result.declarations.push(element.text);
                                                        }
                                                    }
                                                }
                                            }
                                            // TODO declarations, ...
                                        }
                                    }
                                }
                            } else {
                                throw "Expected ObjectLiteralExpression";
                            }
                        }
                        return result;
                    }
                }
            }
        }
    }
}

export class NgModuleFeature implements Feature {
    constructor() {
    }

    analysis(node : ts.Node, context: pr.Context, program: pr.Program) : ts.Node {        
        if (ts.isClassDeclaration(node)) {
            let moduleResult : NgModuleResult = findModule(node, context, program);
            if (moduleResult) {
                context.currentClass.isNgModule = true;
                context.currentClass.ngModuleImports = moduleResult.imports;
                context.currentClass.ngModuleDeclarations = moduleResult.declarations;
            }
        }
        return node;
    }

    declarations(node : ts.Node, context: pr.Context, program: pr.Program) : ts.Node {
        if (ts.isSourceFile(node)) {
            let newStatements = [];
            for (let statement of node.statements) {
                if (ts.isClassDeclaration(statement)) {
                    let currentClass = helper.findClassByName(program, statement.name.text);
                    if (currentClass && currentClass.isNgModule) {
                        // Export symbols provided by forRoot or forChild imports
                        for (let imp of currentClass.ngModuleImports) {
                            if (imp.provides) {
                                // export { imp.imports } = inp.original;
                                let vars = [];
                                for (let v of imp.provides) {
                                    let w = descapitalizeName(v);
                                    let varName = context.factory.createIdentifier(w);
                                    let bindingElement = context.factory.createBindingElement(undefined,undefined,varName,undefined);
                                    vars.push(bindingElement);
                                }
                                let varName = context.factory.createObjectBindingPattern( vars );

                                let varDecl = context.factory.createVariableDeclaration( varName, undefined, undefined, imp.original);
                                let varsDecl = context.factory.createVariableDeclarationList( [ varDecl ] );
                                let exportToken = context.factory.createToken(ts.SyntaxKind.ExportKeyword);
                                let varStatement = context.factory.createVariableStatement( [ exportToken ], varsDecl )
                                newStatements.push( varStatement );
                            }
                        }
                    } else {
                        newStatements.push( statement );
                    }
                } else {
                    newStatements.push( statement );
                }
            }
            return context.factory.updateSourceFile(node,newStatements);
        }
        return node;
    }
}