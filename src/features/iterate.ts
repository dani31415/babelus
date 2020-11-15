import * as ts from 'typescript';

import { Program, Context } from '../program';
import * as helper from "../helper";

export class IterateFeature {
    analysis(node : ts.Node, context:Context, program:Program) : ts.Node {
        return ts.visitEachChild(node, context.visit, context.transformationContext);
    }

    declarations(node : ts.Node, context:Context, program:Program) : ts.Node {
        // Keep track of current class (created during analysis)
        if (ts.isClassDeclaration(node)) {
            let className = helper.getText(node.name);
            context.currentClass = program.findClassByName(className);
        }
        context.ancestors.push(node);
        let newNode = ts.visitEachChild(node, context.visit, context.transformationContext);
        context.ancestors.pop();
        return newNode;
    }
}
