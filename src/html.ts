import * as fs from 'fs';
import * as hp from '@angular/compiler/src/ml_parser/html_parser';
import * as ast from '@angular/compiler/src/ml_parser/ast';

// @angular/compiler @angular/compiler-cli
import { ConstantPool } from '@angular/compiler';
import * as template from '@angular/compiler/src/render3/view/template';
import * as r3_ast from '@angular/compiler/src/render3/r3_ast';
import {Identifiers as R3} from '@angular/compiler/src/render3/r3_identifiers';
import { ParseError } from '@angular/compiler/src/parse_util';
import * as output_ast from '@angular/compiler/src/output/output_ast';
import * as translator from '@angular/compiler-cli/src/ngtsc/translator';
import * as ts from 'typescript';
import { DefaultImportTracker, NoopImportRewriter } from '@angular/compiler-cli/src/ngtsc/imports';

export class Html {
    public process(fileName : string) : hp.ParseTreeResult {
        this.process2(fileName);
        const htmlParser = new hp.HtmlParser();

        let source = fs.readFileSync(fileName).toString();

        let result = htmlParser.parse( source, fileName, {
            tokenizeExpansionForms:true,
            interpolationConfig: {
                start: '{{',
                end: '}}'
            }
        });

        return result;
        //console.log(result);
    }

    protected angularParseTemplate(fileName : string) : r3_ast.Node[] {
        let source = fs.readFileSync(fileName).toString();
        let output : {
            errors?: ParseError[];
            nodes: r3_ast.Node[];
            styleUrls: string[];
            styles: string[];
            ngContentSelectors: string[];
        };
        let options = {
            preserveWhitespaces: false,
            interpolationConfig: {
              start: "{{",
              end: "}}",
            },
            range: undefined,
            escapedString: false,
            enableI18nLegacyMessageIdFormat: true,
            i18nNormalizeLineEndingsInICUs: undefined
        };
        output = template.parseTemplate(source,fileName,options); // string --> r3_ast.node[]
        let nodes : r3_ast.Node[];
        nodes = output.nodes;
        return nodes;
    }

    protected angularBuildTemplateFunction(nodes: r3_ast.Node[]) : output_ast.FunctionExpr {
        const constantPool = new ConstantPool(false);
        //const importManager = new ImportManager(importRewriter);
        const directivesUsed = new Set<output_ast.Expression>();
        const pipeTypeByName = new Map<string, output_ast.Expression>();
        const pipes = new Set<output_ast.Expression>();
        let b = new template.TemplateDefinitionBuilder(
            constantPool,
            template.BindingScope.createRootScope(), 
            0,
            'AppComponent', // the name of the class
            null,
            null,
            'AppComponent_Template', // append '_Template' to the name
            null,
            directivesUsed,
            pipeTypeByName,
            pipes,
            R3.namespaceHTML,
            'src/app/app.component.ts',
            true
        );
        let out : output_ast.FunctionExpr;
        out = b.buildTemplateFunction(nodes,[]); // r3_ast.node[] --> output_ast.FunctionExpr
        return out;
    }

    public angularTranslateExpression(expr: output_ast.Expression) : ts.Expression {
        const importRewriter = new NoopImportRewriter();
        const defaultImportRecorder = new DefaultImportTracker();
        const importManager = new translator.ImportManager(importRewriter);
        return translator.translateExpression(expr,importManager,defaultImportRecorder,ts.ScriptTarget.ES2015);
        return null;
    }

    public process2(fileName : string) : ts.Expression {
        let nodes = this.angularParseTemplate(fileName);
        let func = this.angularBuildTemplateFunction(nodes);
        let expr = this.angularTranslateExpression(func);
        return expr;
        /*let b : template.TemplateDefinitionBuilder;
        let out : output_ast.FunctionExpr;
        out = b.buildTemplateFunction(output.nodes,[]); // r3_ast.node[] --> output_ast.FunctionExpr
        let expr : ts.Expression;
        expr = translator.translateExpression(out,null,null,null);
        return expr;*/

    }
}