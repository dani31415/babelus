import React from 'react';
import Dialog from '@material-ui/core/Dialog';
import { Observable, Subject } from 'rxjs';

export declare class MatDialogConfig<D = any> {
    disableClose?: boolean;
    data?: D | null;
}

export class MatDialog {
    open<T, D = any, R = any>(componentOrTemplateRef: React.ComponentType<T>, config?: MatDialogConfig<D>) {
        matDialogRef.ref.setVisible(true);
        Object.assign(matDialogData, config.data);
        matDialogRef.ref.setChild(componentOrTemplateRef);
        return matDialogRef as MatDialogRef<T, R>;
    }
}

export class MatDialogRef<T, R = any> {
    componentInstance: T;
    ref: DynDialog;
    _afterClosed: Subject<R>;
    constructor() {
        this.afterClosed = this.afterClosed.bind(this);
        this.close = this.close.bind(this);
        this._afterClosed = new Subject();
    }
    afterClosed() : Observable<R | undefined> {
        return this._afterClosed;
    }
    close(b:R) {
        this.ref.setVisible(false);
        this._afterClosed.next(b);
    }
}

export let matDialog = new MatDialog();
export let matDialogRef = new MatDialogRef();

class DynDialogState {
    open:boolean;
    child?:React.ComponentType;
}

export class DynDialog extends React.Component<{},DynDialogState> {
    constructor(props:any) {
        super(props);
        this.state = { open:false };
        matDialogRef.ref = this;
    }

    public setVisible(visible:boolean) {
        this.setState({open:visible})
    }

    public setChild(child:React.ComponentType) {
        this.setState({child})
    }

    render() {
        return <Dialog open={this.state.open}>
            { this.state.child && React.createElement( this.state.child, {}, [] ) };
        </Dialog>
    }
}

export let MAT_DIALOG_DATA = 'MAT_DIALOG_DATA';
export let matDialogData: any = {}