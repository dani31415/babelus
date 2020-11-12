import * as ts from 'typescript';
import path from 'path';

import { Program, InputDeclaration, ClassDeclaration, SourceFile, Context } from '../program';
import * as helper from "../helper";

function relativeToCurrentFile(context: Context, program: Program, moduleName:string) : string {
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

function containsImport(node:ts.SourceFile, symbol:string, file:string) : boolean {
    for (let statement of node.statements) {
        if (ts.isImportDeclaration(statement)) {
            if (ts.isStringLiteral(statement.moduleSpecifier)) {
                if (statement.moduleSpecifier.text != file ) continue;
            }
            if (statement.importClause.namedBindings && 
             ts.isNamedImports(statement.importClause.namedBindings)) {
                for (let binding of statement.importClause.namedBindings.elements) {
                    let text = helper.getText(binding.name);
                    if (text==symbol) return true;
                }
            }
        }
    }
    return false;
}

function createImport(factory:ts.NodeFactory, node:ts.SourceFile, symbols:string[], file:string) : ts.ImportDeclaration {
    let importSpecifiers = [];
    for (let symbol of symbols) {
        if (!containsImport(node,symbol,file)) {
            let identifier = factory.createIdentifier(symbol);
            let importSpecifier = factory.createImportSpecifier(undefined, identifier);
            importSpecifiers.push(importSpecifier);
        }
    }
    if (importSpecifiers.length>0) {
        let namedImports = factory.createNamedImports(importSpecifiers);
        let importClause = factory.createImportClause(false,undefined,namedImports);
        let stringLiteral = factory.createStringLiteral(file);
        let importDeclaration = factory.createImportDeclaration(undefined, undefined, importClause, stringLiteral);
        return importDeclaration;
    }
}

function createImportTop(factory:ts.NodeFactory, symbol:string, file:string) : ts.ImportDeclaration {
    let namedImports = factory.createIdentifier(symbol);
    let importClause = factory.createImportClause(false,namedImports,undefined);
    let stringLiteral = factory.createStringLiteral(file);
    let importDeclaration = factory.createImportDeclaration(undefined, undefined, importClause, stringLiteral);
    return importDeclaration;
}

function setNeedsEmit(sourceFile:SourceFile, program:Program) {
    if (sourceFile.needsEmit) return;
    sourceFile.needsEmit = true;
    for (let dependency of sourceFile.fileDependencies) {
        let sf = program.findSourceFileByFileName(dependency);
        if (sf) {
            setNeedsEmit(sf, program);
        }
    }
}

export class BaseFeature {
    analysis(node : ts.Node, context:Context, program:Program) : ts.Node {
        // Keep track of current class
        if (ts.isClassDeclaration(node)) {
            let classDeclaration = new ClassDeclaration();
            classDeclaration.name = helper.getText(node.name);
            context.currentClass = classDeclaration;
            context.sourceFile.classes.push( classDeclaration );
        }
        // Store file dependencies
        if (ts.isSourceFile(node)) {
            for (let statement of node.statements) {
                if (ts.isImportDeclaration(statement)) {
                    if (ts.isStringLiteral(statement.moduleSpecifier)) {
                        let fileName = statement.moduleSpecifier.text;
                        if (fileName.startsWith('.')) {
                            // Compute the name relative to program.srcDir
                            fileName = path.join( path.dirname(context.sourceFile.sourceFile.fileName), fileName );
                            fileName = './' + path.relative( program.srcDir, fileName );
                        }
                        if (!context.sourceFile.fileDependencies.includes(fileName)) {
                            context.sourceFile.fileDependencies.push(fileName);
                        }
                    }
                }
            }
        }
        return node;
    }

    declarations(node : ts.Node, context:Context, program:Program) : ts.Node {
        // Keep track of current class
        if (ts.isClassDeclaration(node)) {
            let className = helper.getText(node.name);
            if (program.requireClasses.includes( className )) {
                setNeedsEmit(context.sourceFile, program);
            }
        }
        // Remove imports
        if (ts.isImportDeclaration(node)) {
            if (ts.isStringLiteral(node.moduleSpecifier)) {
                let text = node.moduleSpecifier.text;
                if (program.ignoreModules.includes(text)) {
                    return null; // remove
                }
            }
        }
        // Add imports
        if (ts.isSourceFile(node)) {
            let newImports = [];
            context.sourceFile.importsTop.forEach( value => {
                let srcDir = path.dirname(node.fileName);
                let outFileName = value[0];
                if (outFileName.startsWith('/')) {
                    outFileName = path.relative(srcDir,outFileName);
                    let ext = path.extname(outFileName);
                    outFileName = './' + outFileName.substr(0,outFileName.length-ext.length);
                }
                let statement = createImportTop(context.factory,value[1],outFileName);
                newImports.push(statement);
            });
            context.sourceFile.imports.forEach( (values:string[],key:string) => {
                for (let module of program.moduleReplace) {
                    if (key==module.pattern) {
                        key = relativeToCurrentFile(context, program, module.name);
                        break;
                    }
                }
                let srcDir = path.dirname(node.fileName);
                let outFileName = key;
                if (outFileName.startsWith('/')) {
                    outFileName = path.relative(srcDir,key);
                    let ext = path.extname(outFileName);
                    outFileName = './' + outFileName.substr(0,outFileName.length-ext.length);
                }
                let statement = createImport(context.factory,node,values,outFileName);
                if (statement) { // null if imports are already satisfied
                    newImports.push(statement);
                }
            });
            let statements = [...newImports, ...node.statements];

            return context.factory.updateSourceFile(
                node,
                statements,
                node.isDeclarationFile,
                node.referencedFiles,
                node.typeReferenceDirectives,
                node.hasNoDefaultLib,
                node.libReferenceDirectives
            );
        }
        return node;
    }
}
