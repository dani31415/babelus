import { Observable } from 'rxjs';

export interface ComponentType<T> {
    new (...args: any[]): T;
}

export declare class MatDialogConfig<D = any> {
    disableClose?: boolean;
    data?: D | null;
}

export class MatDialog {
    open<T, D = any, R = any>(componentOrTemplateRef: ComponentType<T>, config?: MatDialogConfig<D>): MatDialogRef<T, R> {
        return null;
    }
}

export class MatDialogRef<T, R = any> {
    componentInstance: T;
    afterClosed() : Observable<R | undefined> {
        return null;
    }
}

export let dialog = new MatDialog();
export let dialogRef = new MatDialogRef();
