import * as ts from "typescript";
import { MapArray } from './lib/maparray';

export class Program {
    public srcDir : string;
    public outDir : string;

    public classRename = new Map<string,string>();
    public componentLocation = new Map<string,string>();
    public selectorClass = new Map<string,string>();

    public sourceFiles : ts.SourceFile[];
    public classes = new Map<string,ComponentDeclaration>();
    public fileClasses = new MapArray<string, ComponentDeclaration>();
}

export class InputDeclaration {
    name: string;
    type: ts.TypeNode;
}

export class ComponentDeclaration {
    selector?: string;
    templateUrl?: string;
    inputs: InputDeclaration[];
    name: string;
    isComponent: boolean;
}
