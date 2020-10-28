import * as ts from 'typescript';

import { SrcFile } from './srcfile';
import { Html } from './html';

export class App {
    constructor(private srcFile:SrcFile, private html:Html) {

    }

    public process(srcDir : string, outDir : string) {
        let fileNames = [ srcDir ];
        let options = {
            noEmitOnError: true,
            noImplicitAny: true,
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.CommonJS,
            experimentalDecorators: true,
            outDir: outDir
        };

        let program = ts.createProgram(fileNames, options);

        let allDiagnostics = ts.getPreEmitDiagnostics(program);
    
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

        let sfs : readonly ts.SourceFile[] = program.getSourceFiles();
        for (let sf of sfs) {
            if (fileNames.includes(sf.fileName)) {
                console.log(sf.fileName);
                this.srcFile.show(sf,0);
                this.srcFile.process(sf);
            } else if (sf.fileName.indexOf('/node_modules/')<0) {
                console.log(sf.fileName);
            }
        }
    
    }

}