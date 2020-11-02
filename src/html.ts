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
import * as expr from '@angular/compiler/src/expression_parser/ast';
import * as parse_util from '@angular/compiler/src/parse_util';

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

    private createElement(factory: ts.NodeFactory, tagName: string, children: ts.JsxChild[]) : ts.JsxElement {
        let tag = factory.createIdentifier(tagName);
        let openDiv = factory.createJsxOpeningElement(tag,[], factory.createJsxAttributes([]));
        let closeDiv = factory.createJsxClosingElement(tag);
        let element = factory.createJsxElement(openDiv,children,closeDiv);
        return element;

    }

    private flat<T>(M:T[][]) : T[] {
        let r = [];
        for (let v of M) {
            r = r.concat(v);
        }
        return r;
    }

    private isBlank(c:string) : boolean {
        return c==' ' || c=='\r' || c=='\n' || c=='\t';
    }

    private beginBlanks(pss : parse_util.ParseSourceSpan) : string {
        
        let content = pss.start.file.content
        let i : number;
        for (i=pss.start.offset;i<pss.end.offset;i++) {
            let c = content.charAt(i);
            if (!this.isBlank(c)) {
                break;
            }
        }
        return content.substring(pss.start.offset, i);
    }

    private endBlanks(pss : parse_util.ParseSourceSpan) : string {
        let content = pss.start.file.content
        let i : number;
        for (i=pss.end.offset-1;i>=pss.start.offset;i--) {
            let c = content.charAt(i);
            if (!this.isBlank(c)) {
                break;
            }
        }
        return content.substring(i+1, pss.end.offset);
    }

    private endOffset(node: r3_ast.Node) {
        if (node['endSourceSpan']) {
            return node['endSourceSpan'].end.offset;
        }
        return node.sourceSpan.end.offset;
    }

    public translateTemplate(factory : ts.NodeFactory, fileName : string) : ts.Expression {
        let nodes : r3_ast.Node[];
        nodes = this.angularParseTemplate(fileName);
        let astVisitor =  {
            visitUnary: (ast: expr.Unary, context: any): ts.Expression => { return null; },
            visitBinary: (ast: expr.Binary, context: ts.Expression): ts.Expression => {
                 return null; 
            },
            visitChain: (ast: expr.Chain, context: any): ts.Expression => { return null; },
            visitConditional: (ast: expr.Conditional, context: any): ts.Expression => { return null; },
            visitFunctionCall: (ast: expr.FunctionCall, context: any): ts.Expression => { return null; },
            visitImplicitReceiver: (ast: expr.ImplicitReceiver, context: any): ts.Expression => { return null; },
            visitInterpolation: (ast: expr.Interpolation, context: any): ts.Expression => { return null; },
            visitKeyedRead: (ast: expr.KeyedRead, context: any): ts.Expression => { return null; },
            visitKeyedWrite: (ast: expr.KeyedWrite, context: any): ts.Expression => { return null; },
            visitLiteralArray: (ast: expr.LiteralArray, context: any): ts.Expression => { return null; },
            visitLiteralMap: (ast: expr.LiteralMap, context: any): ts.Expression => { return null; },
            visitLiteralPrimitive: (ast: expr.LiteralPrimitive, context: any): ts.Expression => { 
                if (typeof(ast.value)=='number') {
                    return factory.createNumericLiteral(ast.value);
                } else {
                    return factory.createStringLiteral(""+ast.value);
                }
            },
            visitMethodCall: (ast: expr.MethodCall, context: any): ts.Expression => { return null; },
            visitPipe: (ast: expr.BindingPipe, context: any): ts.Expression => { return null; },
            visitPrefixNot: (ast: expr.PrefixNot, context: any): ts.Expression => { return null; },
            visitNonNullAssert: (ast: expr.NonNullAssert, context: any): ts.Expression => { return null; },
            visitPropertyRead: (ast: expr.PropertyRead, context: any): ts.Expression => { 
                let receiver = ast.receiver;
                let parent : ts.Expression;
                if (receiver instanceof expr.ImplicitReceiver) {
                    parent = factory.createThis();
                } else {
                    parent = receiver.visit(astVisitor);
                }

                let outPropAccess = factory.createPropertyAccessExpression(parent, ast.name);
                return outPropAccess;
            },
            visitPropertyWrite: (ast: expr.PropertyWrite, context: any): ts.Expression => { return null; },
            visitQuote: (ast: expr.Quote, context: any): ts.Expression => { return null; },
            visitSafeMethodCall: (ast: expr.SafeMethodCall, context: any): ts.Expression => { return null; },
            visitSafePropertyRead: (ast: expr.SafePropertyRead, context: any): ts.Expression => { return null; },
            //visitASTWithSource?: (ast: expr.ASTWithSource, context: any): ts.Expression => { return null; },
            /**
             * This function is optionally defined to allow classes that implement this
             * interface to selectively decide if the specified `ast` should be visited.
             * @param ast node to visit
             * @param context context that gets passed to the node and all its children
             */
            //visit?: (ast: expr.AST, context?: any): ts.Expression => { return null; },            
        };
        let visitor = {
            visitElement: (element: r3_ast.Element) : ts.JsxChild[] => { 
                let visitedChildren : ts.JsxChild[][]  = r3_ast.visitAll(visitor, element.children);
                let content = element.sourceSpan.start.file.content;
                // Interlace with blanks
                let newChildren = [];
                newChildren.push(factory.createJsxText(this.endBlanks(element.startSourceSpan)));
                let start = element.startSourceSpan.end.offset;
                for (let i=0;i<element.children.length;i++) {
                    let end = element.children[i].sourceSpan.start.offset;
                    newChildren.push(factory.createJsxText(content.substring(start,end)));
                    newChildren = newChildren.concat(visitedChildren[i]);
                    start = this.endOffset(element.children[i]);
                }
                newChildren.push(factory.createJsxText(content.substring(start,element.endSourceSpan.start.offset)));
                newChildren.push(factory.createJsxText(this.beginBlanks(element.endSourceSpan)));

                let outElement = this.createElement(factory,element.name,newChildren);

                return [
                    factory.createJsxText(this.beginBlanks(element.startSourceSpan)),
                    outElement,
                    factory.createJsxText(this.endBlanks(element.endSourceSpan))];
            },
            visitTemplate: function(template: r3_ast.Template): ts.JsxChild[] { return null; },
            visitContent: function(content: r3_ast.Content): ts.JsxChild[] { return null; },
            visitVariable: function(variable: r3_ast.Variable): ts.JsxChild[] { return null; },
            visitReference: function(reference: r3_ast.Reference): ts.JsxChild[] { return null; },
            visitTextAttribute: function(attribute: r3_ast.TextAttribute): ts.JsxChild[] { return null; },
            visitBoundAttribute: function(attribute: r3_ast.BoundAttribute): ts.JsxChild[] { return null; },
            visitBoundEvent: function(attribute: r3_ast.BoundEvent): ts.JsxChild[] { return null; },
            visitText: (text: r3_ast.Text): ts.JsxChild[] => { 
                return [
                    // Recover begin and end blanks from the source
                    factory.createJsxText(this.beginBlanks(text.sourceSpan)),
                    factory.createJsxText(text.value.trim()),
                    factory.createJsxText(this.endBlanks(text.sourceSpan))
                ];
            },
            visitBoundText: function(text: r3_ast.BoundText): ts.JsxChild[] { 
                let ast : expr.ASTWithSource;
                ast = text.value as expr.ASTWithSource;
                let interpolation : expr.Interpolation;
                interpolation = ast.ast as expr.Interpolation;
                let exprs : ts.Expression[] = interpolation.expressions.map( x => x.visit(astVisitor) );
                let strings : ts.JsxChild[] = interpolation.strings.map( x => factory.createJsxText(x) );
                let result : ts.JsxChild[] = [strings[0]];
                for (let i=0;i<exprs.length;i++) {
                    result.push(factory.createJsxExpression(undefined,exprs[i]));
                    result.push(strings[i+1])
                }
                return result;
            },
            visitIcu: function(icu: r3_ast.Icu): ts.JsxChild[] { return null; }
        }
        let resultss : ts.JsxChild[][];
        resultss = r3_ast.visitAll(visitor,nodes);
        let results : ts.JsxChild[];
        results = this.flat( resultss );
        let result : ts.JsxElement;
        if (results.length==1) {
            result = results[0] as ts.JsxElement;
        } else {
            result = this.createElement(factory, 'React.Fragment', results);
        }

        return result;
    }
}