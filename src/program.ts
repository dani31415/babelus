import path from "path";

import * as ts from "typescript";
import { MapArray } from './lib/maparray';

export class TagRule {
    public selector: string;
    public parentSelector?: string;
    public translate: string;
    public importsTop?: string;
    public imports?: string;
}

export class ModuleReplace {
    public pattern: string;
    public name: string;
    public file: string;
    public symbolRename: [from:string, to:string][];
}

export class Program {
    public srcDir : string;
    public outDir : string;

    public classRename = new Map<string,string>();
    public sourceFiles: SourceFile[];
    public requireClasses: string[] = [];

    public ignoreModules = [ '@angular/core' ]; 
    public ignoreInteraces = [ 'OnInit', 'OnChanges' ];
    public moduleReplace : ModuleReplace[] = []
    public tagRules : TagRule[] = [];
    public assets: string[] = [];
 
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

    public findSourceFileByFileName(fileName: string) : SourceFile {
        for (let sourceFile of this.sourceFiles) {
            // Compute relative name without extension
            let relativeFileName = './' + path.relative( this.srcDir, sourceFile.sourceFile.fileName );
            let ext = path.extname( relativeFileName );
            relativeFileName = relativeFileName.substring(0, relativeFileName.length-ext.length);

            if (fileName == relativeFileName) {
                return sourceFile;
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
}

export class NgModuleImport {
    name: string;
    original: ts.Expression;
}

export class SourceFile {
    public sourceFile: ts.SourceFile;
    public needsEmit: boolean;
    public classes : ClassDeclaration[] = [];
    public imports = new MapArray<string,string>();
    public importsTop : [file:string,symbol:string][] = [];
    public importsAll : [file:string,symbol:string][] = [];
    public fileDependencies : string[] = [];
}

export class ClassDeclaration {
    name: string;
    isComponent: boolean;
    isInjectable: boolean;
    isNgModule: boolean;
    // Component data
    selector?: string;
    templateUrl?: string;
    inputs: InputDeclaration[] = [];
    injectedFields: InjectField[] = [];
    hasAsyncInit?: boolean;
    // Module data
    ngModuleImports: NgModuleImport[] = [];
    ngModuleDeclarations: string[] = [];
}

export class Context {
    fileName: string;
    currentClass: ClassDeclaration;
    sourceFile : SourceFile;
    factory: ts.NodeFactory;
    transformationContext: ts.TransformationContext;
    ancestors: ts.Node[];
    visit: ts.Visitor;
}
