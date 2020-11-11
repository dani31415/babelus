import * as ts from 'typescript';

import { Feature } from './feature';
import * as pr from '../program';
import * as helper from "../helper";

export class CleanInterfaceFeature implements Feature {
    analysis(node:ts.Node, context:pr.Context, program:pr.Program) : ts.Node {
        // Remove imports of unused interfaces
        if (ts.isHeritageClause(node)) {
            if (node.token == ts.SyntaxKind.ImplementsKeyword) {
                let newTypes : ts.ExpressionWithTypeArguments[] = [];
                for (let type of node.types) {
                    if (ts.isIdentifier(type.expression)) {
                        let text = helper.getText(type.expression);
                        if (program.ignoreInteraces.includes(text)) {

                        } else {
                            newTypes.push(type);
                        }
                    }
                }
                if (newTypes.length>0) {
                    return context.factory.updateHeritageClause(node,newTypes);
                } else {
                    return null;
                }
            }
        }
        return node;
    }

    declarations(node:ts.Node, context:pr.Context, program:pr.Program) : ts.Node {
        return node;
    }
}
