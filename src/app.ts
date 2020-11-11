import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

import { SrcFile } from './srcfile';
import { Html } from './html';
import { Program, SourceFile } from './program';
import { Feature } from './features/feature';

export class App {
    constructor(private srcFile:SrcFile, private html:Html, private features:Feature[]) {
    }

    public emitFile(sourceFile: SourceFile, program : Program) {
        //this.srcFile.show(sourceFile);
        let sourceString = this.srcFile.emit(sourceFile.sourceFile);

        // Get output file name
        let outFileName = path.relative(program.srcDir,sourceFile.sourceFile.fileName);

        // Change extension to tsx
        for (let clazz of sourceFile.classes) {
            if (clazz.isComponent) {
                outFileName += 'x'
                break; // only once
            }
        }

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
            allowSyntheticDefaultImports:true,

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
                if (sf.fileName.endsWith('app.component.ts')) {
                    this.srcFile.show(sf);
                }
                let sourceFile = new SourceFile();
                sourceFile.sourceFile = sf;
                program.sourceFiles.push(sourceFile);
            }
        }

        for (let sourceFile of program.sourceFiles) {
            console.log('Input file:',sourceFile.sourceFile.fileName);
        }

        console.log("Analysis...");
        for (let sourceFile of program.sourceFiles) {
            this.srcFile.analysis(sourceFile, program, this.features);
        }

        console.log("Declarations...");
        for (let sourceFile of program.sourceFiles) {
            this.srcFile.declarations(sourceFile, program, this.features);
        }

        console.log("Emiting...");
        for (let sourceFile of program.sourceFiles) {
            if ( sourceFile.needsEmit ) {
                this.emitFile(sourceFile, program);
            }
        }

        console.log("Assets...");
        for (let asset of program.assets) {
            let src = path.join('redist',asset);
            fs.copyFileSync(src,path.join(program.outDir,path.basename(src)));
            console.log('Copy file:',asset+"...");
        }
    }
}