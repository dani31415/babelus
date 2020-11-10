import * as ts from 'typescript';

import { Feature } from './feature';
import * as pr from '../program';
import * as helper from "../helper";

function descapitalizeName( name : string ) {
    if (name.length==0) return name;
    return name.charAt(0).toLowerCase() + name.slice(1);
}

function getCallSuper(factory: ts.NodeFactory) : ts.ExpressionStatement {
    let supet = factory.createToken(ts.SyntaxKind.SuperKeyword);
    let call = factory.createCallExpression(supet,[],[ factory.createIdentifier('props') ]);
    return factory.createExpressionStatement(call);
}

export class DependencyInjectionFeature implements Feature {
    analysis(node:ts.Node, context:pr.Context, program:pr.Program) : ts.Node {
        // Upddate constructor, store injected parameters and mark class as required
        if (ts.isConstructorDeclaration(node)) {
            if (context.currentClass.isComponent || context.currentClass.isInjectable) {
                for (let parameter of node.parameters) {
                    if (ts.isIdentifier(parameter.name) && 
                    ts.isTypeReferenceNode(parameter.type) &&
                    ts.isIdentifier( parameter.type.typeName ) ) {
                        let className = helper.getText( parameter.type.typeName );
                        program.requireClasses.push( className );
                        context.currentClass.injectedFields.push ( { 
                            name: helper.getText( parameter.name ), 
                            className: className 
                        });
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
                context.currentClass.isInjectable = true;
                if (ts.isCallExpression(node.expression))  {
                    let identifier = node.expression.expression;
                    if (ts.isIdentifier(identifier)) {
                        if (identifier.text == 'Injectable') {
                            return null; // remove decorator
                        }
                    }
                }
            }
        }
        return node;
    }

    declarations(node:ts.Node, context:pr.Context, program:pr.Program) : ts.Node {
        // Add imports for injected fields
        if (ts.isClassDeclaration(node)) {
            if (context.currentClass) {
                for (let injectedField of context.currentClass.injectedFields) {
                    let sourceFile = program.findSourceFileByClassName( injectedField.className );
                    if (sourceFile!=null) {
                        context.sourceFile.imports.add( sourceFile.sourceFile.fileName, injectedField.name );
                    } else {
                        console.log('Not found source file for ' + injectedField.className);
                    }
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
                if (clazz.isInjectable) {
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
