import * as ts from 'typescript';

import { Feature } from './feature';
import * as pr from '../program';
import * as helper from "../helper";

export class InputFeature implements Feature {
    analysis(node : ts.Node, processContext: pr.Context, program: pr.Program) : ts.Node {
        // Get list of @Input fields
        if (ts.isPropertyDeclaration(node)) {
            if (processContext.currentClass.isComponent) {
                let componentClass = processContext.currentClass;
                let decorators = node.decorators as ts.NodeArray<ts.Decorator>;
                if (decorators) for (let decorator of decorators) {
                    if (ts.isCallExpression(decorator.expression))  {
                        let identifier = decorator.expression.expression;
                        if (ts.isIdentifier(identifier)) {
                            if (identifier.text == 'Input' && ts.isIdentifier(node.name)) {
                                let name = helper.getText(node.name);
                                componentClass.inputs.push( {
                                    name,
                                    type: node.type
                                } );
                                return null; // remove property declaration
                            }
                        }
                    }
                }
            }
        }
        return node;
    }

    declarations(node : ts.Node, context: pr.Context, program: pr.Program) : ts.Node {
        // Rename property access 
        if (ts.isPropertyAccessExpression(node)) {
            if (context.currentClass && context.currentClass.isComponent) {
                let name = helper.getText( node.name );
                if (node.expression.kind == ts.SyntaxKind.ThisKeyword) {
                    for (let input of context.currentClass.inputs ) {
                        if (input.name == name) {                        
                            // this.name --> this.props.name
                            let prop = context.factory.createIdentifier('props');
                            let thiz = context.factory.createThis();
                            let thisProp = context.factory.createPropertyAccessExpression(thiz,prop);
                            let expr = context.factory.updatePropertyAccessExpression(node,thisProp,node.name);
                            return expr;
                        }
                    }
                }
            }
        }
        // Add propety classes
        if (ts.isSourceFile(node)) {
            let propsClasses = [];
            for (let clazz of context.sourceFile.classes) {
                if (clazz.isComponent) {
                    if (clazz.inputs.length>0) {
                        let declarations = [];
                        for (let input of clazz.inputs) {
                            let propType = input.type;
                            let propertyDeclaration = context.factory.createPropertyDeclaration(null,null,input.name,context.factory.createToken(ts.SyntaxKind.QuestionToken),propType,null);
                            declarations.push(propertyDeclaration);
                        }
                        let propClass = context.factory.createClassDeclaration(
                            null,null,clazz.name + 'Props',null,null,declarations
                        );
                        propsClasses.push(propClass);
                    }
                }
            }

            let statements = [...propsClasses, ...node.statements];

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
        // Add properties class to React.Component
        if (ts.isHeritageClause(node)) {
            if (node.token==ts.SyntaxKind.ExtendsKeyword) {
                if (context.currentClass.isComponent && context.currentClass.inputs.length) {
                    let propsClassname = context.currentClass.name+'Props';
                    let clazzIdent = context.factory.createIdentifier(propsClassname);
                    let clazz = context.factory.createTypeReferenceNode(clazzIdent);

                    let react = context.factory.createIdentifier('React');
                    let component = context.factory.createIdentifier('Component');
                    let reactComponent = context.factory.createPropertyAccessExpression(react,component);
                    let type = context.factory.createExpressionWithTypeArguments(reactComponent, [ clazz ]);
                    return context.factory.updateHeritageClause(node, [ type ]);
                }
            }
        }
        return node;
    }
}