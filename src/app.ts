import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

import { SrcFile } from './srcfile';
import { Html } from './html';
import { Program, SourceFile } from './program';

export class App {
    constructor(private srcFile:SrcFile, private html:Html) {
    }

    public emitFile(sourceFile: ts.SourceFile, program : Program) {
        //this.srcFile.show(sourceFile);
        let sourceString = this.srcFile.emit(sourceFile);

        // Get output file name
        let outFileName = path.relative(program.srcDir,sourceFile.fileName) + 'x';
        //let outFileName = path.basename(sourceFile.fileName)+'x';
        let outFile = path.join(program.outDir,outFileName);
        //console.log(outFile);

        // Write output file
        console.log("Emiting: "+outFile+"...");
        fs.mkdirSync(path.dirname(outFile), {recursive:true} );
        fs.writeFileSync(outFile, sourceString, {
            encoding:'utf8'
        });
    }


    public process(srcFolder : string, srcFile : string, outDir : string) {
        let program = new Program();
        program.srcDir = srcFolder;
        program.outDir = outDir;
    
        let fileNames = [ path.join(srcFolder,srcFile) ];
        let options = {
            noEmitOnError: true,
            //noImplicitAny: true,
            target: ts.ScriptTarget.ES5,
            module: ts.ModuleKind.ESNext,
            experimentalDecorators: true,
            outDir: outDir,
            noEmit: true,

            moduleResolution: ts.ModuleResolutionKind.NodeJs,
            jsx: ts.JsxEmit.Preserve
        };

        let tsProgram = ts.createProgram(fileNames, options);

        let allDiagnostics = ts.getPreEmitDiagnostics(tsProgram);
    
        let stop = false;
        allDiagnostics.forEach(diagnostic => {
            if (diagnostic.category == ts.DiagnosticCategory.Error) {
                stop = true;
            }
            if (diagnostic.file) {
                let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
                let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
                console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
            } else {
                console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
            }
        });
        if (stop) {
            process.exit(1);
        }


        program.sourceFiles = [];

        // Select files to process
        let sfs : readonly ts.SourceFile[] = tsProgram.getSourceFiles();
        for (let sf of sfs) {
            if (fileNames.includes(sf.fileName)) continue; // ignore main.ts file
            if (sf.fileName.indexOf('/node_modules/')<0) {
                if (sf.fileName.endsWith('user.component.ts')) {
                    this.srcFile.show(sf);
                }
                let sourceFile = new SourceFile();
                sourceFile.sourceFile = sf;
                program.sourceFiles.push(sourceFile);
            }
        }

        for (let i=0;i<program.sourceFiles.length;i++) {
            this.srcFile.process2(program.sourceFiles[i], program);
        }

        for (let i=0;i<program.sourceFiles.length;i++) {
            this.srcFile.fixDecklarations(program.sourceFiles[i], program);
        }

        for (let i=0;i<program.sourceFiles.length;i++) {
            if ( program.sourceFiles[i].needsEmit ) {
                this.emitFile(program.sourceFiles[i].sourceFile, program);
            }
        }

    
    }

}