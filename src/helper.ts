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


/**
 * Adds an import of the form 
 *   import <symbol> from <module>
 * @param context 
 * @param program 
 * @param importsTop 
 */
export function addImportTop(context:pr.Context, program:pr.Program, symbol:string, module:string) {
    if (!module || !symbol) return;
    let moduleName = relativeToCurrentFile(context, program, module);
    let importTop : [file:string,symbol:string] = [moduleName,symbol];
    let found = false;
    // Add only once
    for (let it of context.sourceFile.importsTop) {
        if (importTop[0] == it[0] && importTop[1]==it[1]) {
            found = true;
        }
    }
    if (!found) {
        context.sourceFile.importsTop.push(importTop);
    }
}

/**
 * Adds an import of the form 
 *   import {symbol} from <module>
 * @param context 
 * @param program 
 * @param importsTop 
 */
export function addImports(context:pr.Context, program:pr.Program, symbol:string, module:string) {

    if (!module || !symbol) return;
    // Maybe add new imports
    let moduleName = relativeToCurrentFile(context, program, module);
    context.sourceFile.imports.add( moduleName, symbol );
}

/**
 * Create expression
 *   symbol1.symbol2.symbol3...
 * @param context 
 * @param symbols 
 */
export function createPropertyAccessor(context:pr.Context, symbols:string[]) {
    if (symbols.length==0) return context.factory.createToken(ts.SyntaxKind.NullKeyword);
    let result : ts.Expression;
    for (let symbol of symbols) {
        if (symbol=='this' && result==null) {
            result = context.factory.createThis();
        } else {
            let ident = context.factory.createIdentifier(symbol);
            if (result==null) result = ident;
            else result = context.factory.createPropertyAccessExpression(result, ident);
        }
    }
    return result;
}


export function createJsxElement(
    factory: ts.NodeFactory, 
    tagName: string|ts.JsxTagNameExpression, 
    attributes1: {[key:string]:(string|ts.StringLiteral|ts.Expression)}, 
    attributes2: ts.JsxAttributeLike[], 
    children: ts.JsxChild[]) : ts.JsxElement 
{
    let attributeNodes : ts.JsxAttributeLike[] = Object.keys(attributes1).map ( key => {
        let name = factory.createIdentifier(key)
        let v = attributes1[key];
        let value : ts.JsxExpression | ts.StringLiteral;
        if (typeof(v)=='string') {
            value = factory.createStringLiteral(v);
        } else if (ts.isLiteralExpression(v)) {
            value = v;
        } else {
            value = factory.createJsxExpression(undefined, v);
        }
        return factory.createJsxAttribute(name, value);
    });
    attributeNodes = attributeNodes.concat ( attributes2 || []);
    let attributesNode = factory.createJsxAttributes( attributeNodes );
    let tag;
    if (typeof(tagName)=='string') {
        tag = factory.createIdentifier(tagName);
    } else {
        tag = tagName;
    }
    let openDiv = factory.createJsxOpeningElement(tag, [], attributesNode); // factory.createJsxAttributes([]));
    let closeDiv = factory.createJsxClosingElement(tag);
    let element = factory.createJsxElement(openDiv,children,closeDiv);
    return element;
}

type ExprOrStatement = ts.Expression|ts.Statement;

export function newMethod(factory: ts.NodeFactory, name:string, parameters:string[], exprs:ts.Expression[]) {
    let nodeParams = parameters.map( param =>
        factory.createParameterDeclaration(undefined,undefined,undefined,param,undefined,undefined,undefined)
    );
    let statements = exprs.map( expr => factory.createExpressionStatement(expr) );
    let body = factory.createBlock(statements, true);
    return factory.createMethodDeclaration(undefined,undefined,undefined,name,undefined,undefined,nodeParams,undefined,body);
}

type ExprOrIdent = ts.Expression|string;

function toExpression(factory: ts.NodeFactory) : (x:any) => ts.Expression {
    return (x:ExprOrIdent) => {
        if (typeof(x)=='string') return factory.createIdentifier(x);
        if (ts.isJsxExpression(x)) return x.expression;
        return x as ts.Expression;
    }
}

export function createCall(factory: ts.NodeFactory, func:ExprOrIdent, args:ExprOrIdent[]) {
    let nodeArgs = args.map( toExpression(factory) );
    return factory.createCallExpression( toExpression(factory)(func), undefined, nodeArgs);
}

export function createArrowFunction(factory: ts.NodeFactory, parameters:string[], args:ts.Expression|ts.Statement[]) {
    let nodeParams = parameters.map( param =>
        factory.createParameterDeclaration(undefined,undefined,undefined,param,undefined,undefined,undefined)
    );
    let body;
    if (Array.isArray(args)) {
        body = factory.createBlock(args, true);
    } else {
        body = args;
    }
    return factory.createArrowFunction(undefined,undefined,nodeParams,undefined,undefined,body);
}

export function createAttribute(context: pr.Context, name:string, value:ts.Expression|string) {
    let ident = context.factory.createIdentifier(name);
    let initializer;
    if (typeof(value)=='string') {
        initializer = context.factory.createStringLiteral(value);
    } else {
        initializer = context.factory.createJsxExpression(undefined, value);
    }
    return context.factory.createJsxAttribute(ident, initializer);
}

