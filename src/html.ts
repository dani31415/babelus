import * as fs from 'fs';
import * as hp from '@angular/compiler/src/ml_parser/html_parser';
import * as ast from '@angular/compiler/src/ml_parser/ast';

export class Html {
    public process(fileName : string) {
        const htmlParser = new hp.HtmlParser();

        let source = fs.readFileSync(fileName).toString();

        let result = htmlParser.parse( source, fileName);

        console.log(result);
    }
}