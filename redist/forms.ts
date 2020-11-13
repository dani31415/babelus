export class AbstractControl {
    public value:any;
    public dirty:boolean;
    public touched:boolean;
    public invalid:boolean;
    public errors:any;
    public setValue(value:any) {

    }
}

export class FormCtrl extends AbstractControl {
    constructor(formState?: any, validatorOrOpts?: any) {
        super();
    }
}

export class Validators {
    public static required: any;
}

export class FormGroup {
    constructor(controls: {
        [key: string]: AbstractControl;
    }) {

    }
    public controls: any;
    public invalid: boolean;

    public get(key:string) : AbstractControl {
        return null;
    }
}

