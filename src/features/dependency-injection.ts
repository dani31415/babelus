import * as ts from 'typescript';

import { Feature } from './feature';
import * as pr from '../program';
import * as helper from "../helper";

function normalizeTokenName(name : string) {
    let res = '';
    let capitalizeNext = true;
    for (let i=0;i<name.length;i++) {
        let c = name.charAt(i);
        if (c=='_') capitalizeNext = true;
        else {
            if (capitalizeNext) {
                res += c.toUpperCase();
                capitalizeNext = false;
            } else {
                res += c.toLowerCase();
            }
        }
    }
    return res;
}

function descapitalizeName( name : string ) {
    if (name.length==0) return name;
    return name.charAt(0).toLowerCase() + name.slice(1);
}

function getCallSuper(factory: ts.NodeFactory) : ts.ExpressionStatement {
    let supet = factory.createToken(ts.SyntaxKind.SuperKeyword);
    let call = factory.createCallExpression(supet,[],[ factory.createIdentifier('props') ]);
    return factory.createExpressionStatement(call);
}

function findImport(sourceFile:ts.SourceFile, symbol:string) : ts.Expression {
    for (let statement of sourceFile.statements) {
        if (ts.isImportDeclaration(statement)) {
            if (statement.importClause.namedBindings) {
                if (ts.isNamedImports(statement.importClause.namedBindings)) {
                    for (let element of  statement.importClause.namedBindings.elements) {
                        if (element.name.text==symbol) {
                            return statement.moduleSpecifier;
                        }
                    }
                }
            }
        }
    }
}

export class DependencyInjectionFeature implements Feature {
    analysis(node:ts.Node, context:pr.Context, program:pr.Program) : ts.Node {
        // Upddate constructor, store injected parameters and mark class as required
        if (ts.isConstructorDeclaration(node)) {
            if (context.currentClass.isComponent || context.currentClass.isInjectable) {
                // Get list of injected variables and types from constructor
                for (let parameter of node.parameters) {
                    if (ts.isIdentifier(parameter.name)) {
                        // Parameters with @Inject :
                        //   @Inject(MAT_DIALOG_DATA) public data
                        if (parameter.decorators) {
                            for (let decorator of parameter.decorators) {
                                if (ts.isCallExpression(decorator.expression)) {
                                    if (ts.isIdentifier(decorator.expression.expression)) {
                                        if (decorator.expression.expression.text=='Inject') {
                                            if (decorator.expression.arguments.length == 1) {
                                                let symbol = decorator.expression.arguments[0];
                                                if (ts.isIdentifier(symbol)) {
                                                    context.currentClass.injectedFields.push ( { 
                                                        name: parameter.name.text,
                                                        className: normalizeTokenName(symbol.text)
                                                    });                        
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (ts.isTypeReferenceNode(parameter.type) &&
                        ts.isIdentifier( parameter.type.typeName ) ) {
                            let className = helper.getText( parameter.type.typeName );
                            program.requireClasses.push( className );
                            let varName = helper.getText( parameter.name );
                            context.currentClass.injectedFields.push ( { 
                                name: varName,
                                className: className
                            });
                        }
                    }
                }
                let block;
                let propDeclarations;
                // Replace arguments and add super()
                if (context.currentClass.isComponent) {
                    let superCall = getCallSuper(context.factory);
                    block = context.factory.createBlock( [ superCall, ...node.body.statements ], true );
                    let anyToken = context.factory.createToken(ts.SyntaxKind.AnyKeyword);
                    propDeclarations = [ context.factory.createParameterDeclaration( undefined, undefined, undefined, 'props', undefined, anyToken, undefined ) ];
                } else {
                    block = node.body;
                    propDeclarations = [];
                }
                return context.factory.updateConstructorDeclaration(
                    node,
                    node.decorators,
                    node.modifiers,
                    propDeclarations,
                    block
                )
            }
        }
        // Remove decorator
        if (ts.isDecorator(node)) {
            if (node.parent.kind == ts.SyntaxKind.ClassDeclaration) {
                if (ts.isCallExpression(node.expression))  {
                    let identifier = node.expression.expression;
                    if (ts.isIdentifier(identifier)) {
                        if (identifier.text == 'Injectable') {
                            context.currentClass.isInjectable = true;
                            return null; // remove decorator
                        }
                    }
                }
            }
        }
        return node;
    }

    declarations(node:ts.Node, context:pr.Context, program:pr.Program) : ts.Node {
        // Import symbols 
        if (ts.isConstructorDeclaration(node)) {
            if (context.currentClass.isComponent || context.currentClass.isInjectable) {
                let imps = [];
                // Find the providers
                context.currentClass.createSingleton = true;
                for (let injectField of context.currentClass.injectedFields) {
                    if (imps) {
                        let fileName = helper.findFileNameByProvides(program, injectField.className);
                        if (fileName) {
                            imps.push([fileName,injectField.name,injectField.className]);
                        } else {
                            // Only if we have providers for all fields we can generate a singleton
                            context.currentClass.createSingleton = false;
                        }
                    }
                }
                for (let imp of imps) {
                    let moduleName = helper.relativeToCurrentFile(context, program, imp[0]);
                    let symbol;
                    if (descapitalizeName(imp[2])==imp[1]) {
                        symbol = imp[1];
                    } else {
                        symbol = descapitalizeName(imp[2])+' as '+imp[1];
                    }
                    context.sourceFile.imports.add( moduleName, symbol );
                }
            }
        }
        // Remove this from injected object access
        if (ts.isPropertyAccessExpression(node)) {
            if (context.currentClass && context.currentClass.injectedFields.length>0) {
                let name = helper.getText( node.name );
                if (node.expression.kind == ts.SyntaxKind.ThisKeyword) {
                    for (let injectField of context.currentClass.injectedFields ) {
                        if (injectField.name == name) {
                            return node.name;
                        }
                    }
                }
            }
        }
        // Export object creation
        if (ts.isSourceFile(node)) {
            let objectCreations = [];
            for (let clazz of context.sourceFile.classes) {
                if (clazz.isInjectable && clazz.createSingleton) {
                    let exportToken = context.factory.createToken(ts.SyntaxKind.ExportKeyword);
                    let varName = descapitalizeName( clazz.name );
                    //let varIdent = context.factory.createIdentifier( varName );
                    let classIdent = context.factory.createIdentifier( clazz.name );
                    let newExpr = context.factory.createNewExpression( classIdent, [], [])
                    let varDecl = context.factory.createVariableDeclaration( varName, undefined, undefined, newExpr);
                    let vars = context.factory.createVariableDeclarationList( [ varDecl ] );
                    let varStatement = context.factory.createVariableStatement( [ exportToken ], vars )
                    objectCreations.push ( varStatement );
                }
            }

            let statements = [...node.statements, ...objectCreations];

            return context.factory.updateSourceFile(
                node,
                statements,
                node.isDeclarationFile,
                node.referencedFiles,
                node.typeReferenceDirectives,
                node.hasNoDefaultLib,
                node.libReferenceDirectives
            );
 
        }
        return node;
    }
}
