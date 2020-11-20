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

let symbolToNode = {
    '||':ts.SyntaxKind.BarBarToken,
    '&&':ts.SyntaxKind.AmpersandAmpersandToken,
    '==':ts.SyntaxKind.EqualsEqualsToken
};

function visitEachChild(node:r3_ast.Node, visitor, context) {

}

function flat<T>(M:T[][]) : T[] {
    let r = [];
    for (let v of M) {
        r = r.concat(v);
    }
    return r;
}

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

    private createElement(factory: ts.NodeFactory, tagName: string, attributes: r3_ast.TextAttribute[], inputs: ts.JsxAttribute[], children: ts.JsxChild[]) : ts.JsxElement {
        let attributeNodes = attributes.map ( attribute => {
            let name = factory.createIdentifier(attribute.name)
            let value = factory.createStringLiteral(attribute.value);
            return factory.createJsxAttribute(name, value);
        });
        attributeNodes = attributeNodes.concat ( inputs );
        let attributesNode = factory.createJsxAttributes( attributeNodes );
        let tag = factory.createIdentifier(tagName);
        let openDiv = factory.createJsxOpeningElement(tag, [], attributesNode); // factory.createJsxAttributes([]));
        let closeDiv = factory.createJsxClosingElement(tag);
        let element = factory.createJsxElement(openDiv,children,closeDiv);
        return element;
    }

    private createOCElement(factory: ts.NodeFactory, tagName: string, attributes: r3_ast.TextAttribute[], inputs: ts.JsxAttribute[]) : ts.JsxSelfClosingElement {
        let attributeNodes = attributes.map ( attribute => {
            let name = factory.createIdentifier(attribute.name)
            let value = factory.createStringLiteral(attribute.value);
            return factory.createJsxAttribute(name, value);
        });
        attributeNodes = attributeNodes.concat ( inputs );
        let attributesNode = factory.createJsxAttributes( attributeNodes );
        let tag = factory.createIdentifier(tagName);
        let element = factory.createJsxSelfClosingElement(tag, [], attributesNode); // factory.createJsxAttributes([]));
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
        if (pss==null) return '';
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
        if (pss==null) return '';
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

    private createText(factory: ts.NodeFactory, text:string) : ts.JsxText[] {
        if (text==null || text.length==0) return [];
        return [ factory.createJsxText(text) ];
    }

    public translateTemplate(factory : ts.NodeFactory, fileName : string) : ts.Expression {
        let nodes : r3_ast.Node[];
        nodes = this.angularParseTemplate(fileName);
        let scopedVars = [];

        let visitBoundAttribute = function(attribute : r3_ast.BoundAttribute) : ts.JsxAttribute {
            let expr = attribute.value.visit(astVisitor);
            let jsxExpr = factory.createJsxExpression(undefined, expr);
            let ident = factory.createIdentifier(attribute.name);
            return factory.createJsxAttribute(ident, jsxExpr);
        }

        let astVisitor =  {
            visitUnary: (ast: expr.Unary, context: any): ts.Expression => { 
                return null; 
            },
            visitBinary: (ast: expr.Binary, context: ts.Expression): ts.Expression => {
                let kind = symbolToNode[ast.operation];
                if (kind==null) {
                    console.log("Unknown operation: " + ast.operation);
                    //throw "Unknown operation '" + ast.operation + '"';
                }
                let leftExpr = ast.left.visit(astVisitor);
                let rightExpr = ast.right.visit(astVisitor);
                return factory.createBinaryExpression(leftExpr, kind, rightExpr);
            },
            visitChain: (ast: expr.Chain, context: any): ts.Expression => { return null; },
            visitConditional: (ast: expr.Conditional, context: any): ts.Expression => { 
                return null; 
                 return null; 
                return null; 
            },
            visitFunctionCall: (ast: expr.FunctionCall, context: any): ts.Expression => { return null; },
            visitImplicitReceiver: (ast: expr.ImplicitReceiver, context: any): ts.Expression => { return null; },
            visitInterpolation: (ast: expr.Interpolation, context: any): ts.Expression => { 
                let visitedExpressions = ast.expressions.map( x => x.visit(astVisitor) );
                let visitedStrings = ast.strings.map( x => x.length>0?factory.createStringLiteral(x):null );
                let sum = [];
                for (let i=0;i<visitedStrings.length;i++) {
                    if (visitedStrings[i]!=null) {
                        sum.push(visitedStrings[i]);
                    }
                    if (i<visitedExpressions.length) {
                        sum.push(visitedExpressions[i]);
                    }
                }
                let v = sum[0];
                let plusToken = factory.createToken(ts.SyntaxKind.PlusToken);
                for (let i=1;i<sum.length;i++) {
                    v = factory.createBinaryExpression(v,plusToken,sum[i]);
                }
                return v;
            },
            visitKeyedRead: (ast: expr.KeyedRead, context: any): ts.Expression => { return null; },
            visitKeyedWrite: (ast: expr.KeyedWrite, context: any): ts.Expression => { return null; },
            visitLiteralArray: (ast: expr.LiteralArray, context: any): ts.Expression => { return null; },
            visitLiteralMap: (ast: expr.LiteralMap, context: any): ts.Expression => { return null; },
            visitLiteralPrimitive: (ast: expr.LiteralPrimitive, context: any): ts.Expression => { 
                if (typeof(ast.value)=='number') {
                    return factory.createNumericLiteral(ast.value);
                } else if (typeof(ast.value)=='boolean') {
                    if (ast.value) {
                        return factory.createToken(ts.SyntaxKind.TrueKeyword);
                    } else {
                        return factory.createToken(ts.SyntaxKind.FalseKeyword);
                    }
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
                    if (scopedVars.includes(ast.name)) {
                        return factory.createIdentifier(ast.name);
                    }
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
                let visitedInputs : ts.JsxAttribute[]  = element.inputs.map( visitBoundAttribute );
                let content = element.sourceSpan.start.file.content;
                // Interlace with blanks
                let newChildren : ts.JsxChild[];
                if (!element.endSourceSpan) { // <br>, <input>, <img>
                    let outElement = this.createOCElement(factory,element.name,element.attributes,visitedInputs);
                    return [
                        ...this.createText(factory, this.beginBlanks(element.startSourceSpan)),
                        outElement,
                        ...this.createText(factory, this.endBlanks(element.startSourceSpan))];    
                }

                newChildren = [ ...this.createText(factory, this.endBlanks(element.startSourceSpan)) ];
                let start = element.startSourceSpan.end.offset;
                for (let i=0;i<element.children.length;i++) {
                    let end = element.children[i].sourceSpan.start.offset;
                    newChildren = newChildren.concat( [ ...this.createText(factory, content.substring(start,end)) ] );
                    newChildren = newChildren.concat(visitedChildren[i]);
                    start = this.endOffset(element.children[i]);
                }
                newChildren = newChildren.concat( [ ...this.createText(factory, content.substring(start,element.endSourceSpan.start.offset)) ] );
                newChildren = newChildren.concat( [ ...this.createText(factory, this.beginBlanks(element.endSourceSpan)) ] );

                let outElement = this.createElement(factory,element.name,element.attributes,visitedInputs,newChildren);

                return [
                    ...this.createText(factory, this.beginBlanks(element.startSourceSpan)),
                    outElement,
                    ...this.createText(factory, this.endBlanks(element.endSourceSpan))];
            },
            visitTemplate: (template: r3_ast.Template): ts.JsxChild[] => {
                // Get children as jsxChild
                let expression: ts.Expression;

                for (let attr of template.templateAttrs) {
                    if (attr instanceof r3_ast.BoundAttribute) {
                        if (attr.name=='ngIf') {
                            let value : expr.ASTWithSource = attr.value as expr.ASTWithSource;
                            let expr : ts.Expression = value.visit(astVisitor);

                            let children = flat( r3_ast.visitAll(visitor, template.children) );
                            if (children.length!=1 ) {
                                throw "Expected single children";
                            }
                            let child = children[0];
                            if (ts.isJsxElement(child)) {
                                expression = factory.createBinaryExpression(expr,ts.SyntaxKind.AmpersandAmpersandToken,child);
                            }
                        } else if (attr.name=='ngForOf') {
                            // Visit children 
                            let vars = template.variables.map( x => x.name );
                            let oldScopedVars = scopedVars;
                            scopedVars = scopedVars.concat(vars);
                            let children = flat( r3_ast.visitAll(visitor, template.children) );
                            scopedVars = oldScopedVars; // restore vars
                            if (children.length!=1 ) {
                                throw "Expected single children";
                            }
                            let child = children[0];
                            if (ts.isJsxElement(child)) {
                                let value : expr.ASTWithSource = attr.value as expr.ASTWithSource;
                                let list : ts.Expression = value.visit(astVisitor);
                                
                                //template.variables;
                                let map = factory.createPropertyAccessExpression(list,'map');
                                    let statement = factory.createReturnStatement( child );
                                let body = factory.createBlock( [ statement ] );
                                let vars : ts.ParameterDeclaration[] = [];
                                for (let v of template.variables) {
                                    let ident = factory.createIdentifier( v.name );
                                    vars.push( 
                                        factory.createParameterDeclaration(undefined,undefined,undefined,ident,undefined,undefined)
                                    );
                                }
                                let func = factory.createArrowFunction(undefined,undefined,vars,undefined,
                                  factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken), body);
                                let callExpression = factory.createCallExpression( map, null, [ func ] );
                                // list && list.map(...)
                                expression = factory.createBinaryExpression(list, ts.SyntaxKind.AmpersandAmpersandToken, callExpression);
                            }
                            // list.map ( variables => {} )
                        } else {
                            //throw "Do not know what to do!";
                        }
                    } else {
                        console.log("Incorrect attribute type for " + attr.name);
                    }
                }
                return [factory.createJsxExpression(undefined,expression)];
            },
            visitContent: function(content: r3_ast.Content): ts.JsxChild[] { return null; },
            visitVariable: function(variable: r3_ast.Variable): ts.JsxChild[] { return null; },
            visitReference: function(reference: r3_ast.Reference): ts.JsxChild[] { return null; },
            visitTextAttribute: function(attribute: r3_ast.TextAttribute): ts.JsxChild[] { return null; },
            visitBoundAttribute: function(attribute: r3_ast.BoundAttribute): ts.JsxChild[] { return null; },
            visitBoundEvent: function(attribute: r3_ast.BoundEvent): ts.JsxChild[] { return null; },
            visitText: (text: r3_ast.Text): ts.JsxChild[] => { 
                return [
                    // Recover begin and end blanks from the source
                    ...this.createText(factory, this.beginBlanks(text.sourceSpan)),
                    factory.createJsxText(text.value.trim()),
                    ...this.createText(factory, this.endBlanks(text.sourceSpan))
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
            let result0 = results[0];
            if (ts.isJsxElement(result0)) {
                result = result0;
            } else {
                result = this.createElement(factory, 'React.Fragment', [], [], [ result0 ]);
            }
        } else {
            result = this.createElement(factory, 'React.Fragment', [], [], results);
        }

        return result;
    }
}