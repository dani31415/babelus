export class FormCtrl {
    constructor(formState?: any, validatorOrOpts?: any) {

    }
    public setValue(value:any) {

    }
}

export class Validators {
    public static required: any;
}

export class FormGroup {
    constructor(controls: {
        [key: string]: FormCtrl;
    }) {

    }
    public controls: any;

    public get(key:string) : FormCtrl {
        return null;
    }
}

