import path from 'path';

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
    return findImport(program, ngModuleClass, imp);
}

export function findSourceFileByClassName(program:pr.Program, className:string) : pr.SourceFile {
    for (let sourceFile of program.sourceFiles) {
        for (let clazz of sourceFile.classes) {
            if (clazz.name==className) return sourceFile;
        }
    }
}

export function getProvidesFromModuleMethod(program:pr.Program,moduleMethod:string) : string[] {
    for (let imp of program.moduleProvides) {
        if (imp.moduleMethod==moduleMethod) return imp.provides;
    }
}

export function getProvidesFromModule(program:pr.Program,module:string) : string[] {
    for (let imp of program.moduleProvides) {
        if (imp.module==module) return imp.provides;
    }
}

export function getProviders(program:pr.Program, symbol:string) : string[] {
    let providers = [];
    for (let sourceFile of program.sourceFiles) {
        for (let clazz of sourceFile.classes) {
            for (let imp of clazz.ngModuleImports) {
                if (imp.provides) for (let p of imp.provides) {
                    if (p==symbol) {
                        // Found provider
                        if (imp.name.indexOf('.')<0) {
                            // The provider is imp.name
                            if (!providers.includes(imp.name)) { // add once
                                providers.push(imp.name);
                            }
                        } else {
                            // The provider is clazz.name
                            if (!providers.includes(clazz.name)) { // add once
                                providers.push(clazz.name);
                            }
                        }
                    }
                }
            }
        }
    }
    for (let moduleProvides of program.moduleProvides) {
        if (moduleProvides.module && moduleProvides.provides.includes(symbol)) {
            let str = moduleProvides.module || moduleProvides.moduleMethod;
            if (!providers.includes(str)) { // add once
                providers.push(str);
            }
        }
    }
    return providers;
}

export function findFileNameByProvides(program:pr.Program, className:string) : string {
    let injectClass = findClassByName(program, className);
    if (injectClass!=null) {
        if (canCreateSingleton(program,injectClass)) {
            let sourceFile = findSourceFileByClassName(program, className);
            if (sourceFile) {
                sourceFile.needsEmit = true;
                return sourceFile.sourceFile.fileName;
            }
        }
    }
    // TODO check that the field is provided by a single module, forRoot or forChild
    let providers = getProviders(program, className);
    console.log("Providers: ",JSON.stringify(providers));
    if (providers.length==1) {
        if (providers[0].charAt(0)=='.') return providers[0];
        let sourceFile = findSourceFileByClassName(program, providers[0]);
        if (sourceFile) {
            sourceFile.needsEmit = true;
            return sourceFile.sourceFile.fileName;
        }
    }
    return null;
}

function canCreateSingleton(program:pr.Program, clazz:pr.ClassDeclaration) {
    if (clazz.createSingleton!=null) return clazz.createSingleton;
    for (let injectField of clazz.injectedFields) {
        let fileName = findFileNameByProvides(program, injectField.className);
        if (fileName==null) {
            clazz.createSingleton = false;
            return false;
        }
    }
    clazz.createSingleton = true;
    return true;
}

/*export function canCreateSingleton(program:pr.Program, clazz:pr.ClassDeclaration) {
    // createSingleton
    for (let injectField of clazz.injectedFields) {
        let injectClass = findClassByName(program, injectField.className);
        //let injectClass = findSourceFileByClassName(program, injectField.className);
        if (injectClass==null) {
            // TODO check that the field is provided by a single module, forRoot or forChild
            console.log("Class not found:",injectField.className);
            let providers = getProviders(program, injectField.className);
            console.log("Providers: ",JSON.stringify(providers));
        } else {
            canCreateSingleton(program,injectClass);
        }
    }
    clazz.createSingleton = true;
    return true;
}*/

export function relativeToCurrentFile(context: pr.Context, program: pr.Program, moduleName:string) : string {
    if (moduleName.charAt(0)=='.') {
        let moduleName0 = path.join(program.srcDir, moduleName);
        let moduleName1 = path.relative(path.dirname(context.fileName),moduleName0);
        if (!program.assets.includes(moduleName)) {
            program.assets.push(moduleName);
        }
        return moduleName1;
    } else {
        return moduleName;
    }
}
