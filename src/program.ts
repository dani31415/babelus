import * as ts from "typescript";
import { MapArray } from './lib/maparray';

export class Program {
    public srcDir : string;
    public outDir : string;

    public classRename = new Map<string,string>();
    public sourceFiles : SourceFile[];

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

    public findClassBySelector(selector : string) : ComponentDeclaration  {
        for (let sourceFile of this.sourceFiles) {
            for (let clazz of sourceFile.classes) {
                if (clazz.isComponent) {
                    let classComponent = clazz as ComponentDeclaration;
                    if (classComponent.selector == selector) return classComponent;
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

export class SourceFile {
    public sourceFile: ts.SourceFile;
    public needsEmit: boolean;
    public classes : ClassDeclaration[] = [];
}

export class ClassDeclaration {
    name: string;
    isComponent: boolean;
}

export class ComponentDeclaration extends ClassDeclaration {
    selector?: string;
    templateUrl?: string;
    inputs: InputDeclaration[];
}
