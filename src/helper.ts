import * as ts from 'typescript';
import * as pr from './program';

export function getText(ident : ts.JsxTagNameExpression|ts.PrivateIdentifier) : string {
    if (ts.isIdentifier(ident) || ts.isPrivateIdentifier(ident)) {
        return ident.text;
    } else if (ts.isThisTypeNode(ident)) {
        return 'this';
    } else if (ts.isPropertyAccessExpression(ident)) {
        return getText(ident.name);
    }
}

export function findNgModuleByComponent(program:pr.Program, componentClass:pr.ClassDeclaration) : pr.ClassDeclaration {
    for (let sourceFile of program.sourceFiles) {
        for (let clazz of sourceFile.classes) {
            if (clazz.isNgModule) {
                for (let declaration of clazz.ngModuleDeclarations) {
                    let declarationSearch = program.classRename.get(declaration) || declaration;
                    if (declarationSearch==componentClass.name) return clazz;
                }
            }
        }
    }
}

export function findClassByName(program:pr.Program, className:string) : pr.ClassDeclaration {
    for (let sourceFile of program.sourceFiles) {
        for (let clazz of sourceFile.classes) {
            if (clazz.name==className) return clazz;
        }
    }
}

export function findImport(program:pr.Program, ngModuleClass:pr.ClassDeclaration, imp:string) : pr.ClassDeclaration {
    for (let i of ngModuleClass.ngModuleImports) {
        if (i.provides) {
            for (let j of i.provides) {
                if (j==imp) {
                    return ngModuleClass;
                }
            }
        }
    }
    for (let i of ngModuleClass.ngModuleImports) {
        // Iterate for imported modules
        let ngModule = findClassByName(program, i.name);
        if (ngModule!=null) {
            let res = findImport(program, ngModule, imp);
            if (res) return res;
        }
    }
}

export function findNgModuleByComponentAndImport(program:pr.Program, clazz:pr.ClassDeclaration, imp:string) : pr.ClassDeclaration {
    let ngModuleClass = findNgModuleByComponent(program, clazz);
    console.log("Module of component:",clazz.name,ngModuleClass.name)
    return findImport(program, ngModuleClass, imp);
}

export function findSourceFileByClassName(program:pr.Program, className:string) : pr.SourceFile {
    for (let sourceFile of program.sourceFiles) {
        for (let clazz of sourceFile.classes) {
            if (clazz.name==className) return sourceFile;
        }
    }
}

export function getProvidesFromModule(program:pr.Program,module:string) : string[] {
    for (let imp of program.moduleProvides) {
        if (imp.moduleMethod==module) return imp.provides;
    }
}
