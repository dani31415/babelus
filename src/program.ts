import * as ts from "typescript";
import { MapArray } from './lib/maparray';

export class Program {
    public srcDir : string;
    public outDir : string;

    public classRename = new Map<string,string>();
    public sourceFiles: SourceFile[];
    public requireClasses: string[] = [];

    public ignoreModules = [ '@angular/core' ]; 

    public findClassByName(className : string) : ClassDeclaration  {
        let newName = this.classRename.get(className);
        if (newName) {
            className = newName;
        }
        for (let sourceFile of this.sourceFiles) {
            for (let clazz of sourceFile.classes) {
                if (clazz.name == className) return clazz;
            }
        }
    }

    public findClassBySelector(selector : string) : ClassDeclaration  {
        for (let sourceFile of this.sourceFiles) {
            for (let clazz of sourceFile.classes) {
                if (clazz.isComponent) {
                    if (clazz.selector == selector) return clazz;
                }
            }
        }
    }

    public findSourceFileByClassName(className : string) : SourceFile  {
        let newName = this.classRename.get(className);
        if (newName) {
            className = newName;
        }
        for (let sourceFile of this.sourceFiles) {
            for (let clazz of sourceFile.classes) {
                if (clazz.name == className) {
                    return sourceFile;
                }
            }
        }
    }

}

export class InputDeclaration {
    name: string;
    type: ts.TypeNode;
}

export class InjectField {
    name: string;
    className: string;
}

export class SourceFile {
    public sourceFile: ts.SourceFile;
    public needsEmit: boolean;
    public classes : ClassDeclaration[] = [];
    public imports = new MapArray<string,string>();
}

export class ClassDeclaration {
    name: string;
    isComponent: boolean;
    isInjectable: boolean;
    selector?: string;
    templateUrl?: string;
    inputs: InputDeclaration[] = [];
    injectedFields: InjectField[] = [];
}

export class Context {
    fileName: string;
    currentClass: ClassDeclaration;
    sourceFile : SourceFile;
    factory: ts.NodeFactory;
    transformationContext: ts.TransformationContext;
    visit: ts.Visitor;
}
