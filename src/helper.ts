import * as ts from 'typescript';

export function getText(ident : ts.JsxTagNameExpression|ts.PrivateIdentifier) : string {
    if (ts.isIdentifier(ident) || ts.isPrivateIdentifier(ident)) {
        return ident.text;
    } else if (ts.isThisTypeNode(ident)) {
        return 'this';
    } else if (ts.isPropertyAccessExpression(ident)) {
        return getText(ident.name);
    }
}
