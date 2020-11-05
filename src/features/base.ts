import * as ts from 'typescript';
import path from 'path';

import { Program, InputDeclaration, ClassDeclaration, SourceFile, Context } from '../program';
import * as helper from "../helper";

function createImport(factory:ts.NodeFactory, symbols:string[], file:string) : ts.ImportDeclaration {
    let importSpecifiers = [];
    for (let symbol of symbols) {
        let identifier = factory.createIdentifier(symbol);
        let importSpecifier = factory.createImportSpecifier(undefined, identifier);
        importSpecifiers.push(importSpecifier);
    }
    let namedImports = factory.createNamedImports(importSpecifiers);
    let importClause = factory.createImportClause(false,undefined,namedImports);
    let stringLiteral = factory.createStringLiteral(file);
    let importDeclaration = factory.createImportDeclaration(undefined, undefined, importClause, stringLiteral);
    return importDeclaration;
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
        return node;
    }

    declarations(node : ts.Node, context:Context, program:Program) : ts.Node {
        // Keep track of current class
        if (ts.isClassDeclaration(node)) {
            let className = helper.getText(node.name);
            if (program.requireClasses.includes( className )) {
                context.sourceFile.needsEmit = true;
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
            context.sourceFile.imports.forEach( (values,key) => {
                let srcDir = path.dirname(node.fileName);
                let outFileName = path.relative(srcDir,key);
                let ext = path.extname(outFileName);
                outFileName = './' + outFileName.substr(0,outFileName.length-ext.length);
                let statement = createImport(context.factory,values,outFileName);
                newImports.push(statement);
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
