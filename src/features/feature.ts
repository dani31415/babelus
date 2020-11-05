import * as ts from 'typescript';

import * as pr from '../program';

export type FeatureVisitor = (node : ts.Node, context: pr.Context, program: pr.Program) => ts.Node;

export interface Feature {
    analysis(node : ts.Node, context: pr.Context, program: pr.Program) : ts.Node;
    declarations(node : ts.Node, context: pr.Context, program: pr.Program) : ts.Node;
}