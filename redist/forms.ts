export declare type ValidationErrors = {
    [key: string]: any;
};

export declare interface ValidatorFn {
    (control: AbstractControl): ValidationErrors | null;
}

export class AbstractControl {
    public value:any;
    public dirty:boolean;
    public touched:boolean;
    public invalid:boolean;
    public errors:any;
    public validators: ValidatorFn[] = [];
    public constructor() {
        this.handleInputChange = this.handleInputChange.bind(this);
        this.handleFocus = this.handleFocus.bind(this);
    }
    public setValue(value:any) {
        this.value = value;
        this.invalid = false;
        this.errors = {}
        for (let validator of this.validators) {
            let res = validator(this);
            if (res!=null) {
                this.invalid = true;
                Object.assign(this.errors, res);
            }   
        }
    }
    public handleFocus(event, this_) {
        this.touched = true;
        this_.forceUpdate();
    }
    public handleInputChange(event, this_) {
        const target = event.target;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        this.setValue(value);
        this.dirty = true;
        this_.forceUpdate();
    }
}

export class FormCtrl extends AbstractControl {
    constructor(formState?: any, validatorOrOpts?: ValidatorFn) {
        super();
        if (validatorOrOpts)
            this.validators.push(validatorOrOpts);
    }
}

export class Validators {
    static required(abstract:AbstractControl) : ValidationErrors {
        if (abstract.value==null || abstract.value.length==0) {
            return { required:true };
        }
        return null;
    }
}

export class FormGroup {
    constructor(controls: {
        [key: string]: AbstractControl;
    }) {
        this.controls = controls;
    }
    public controls: any;

    public get invalid() : boolean {
        // invalid if there is a single invalid control
        for (let key of Object.keys(this.controls)) {
            let control = this.controls[key];
            if (control.invalid) {
                return true; // invalid
            }
        }
        return false; // valid
    }

    public get(key:string) : AbstractControl {
        return this.controls[key];
    }
}

