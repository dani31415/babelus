export class AbstractControl {
    public value:any;
    public dirty:boolean;
    public touched:boolean;
    public invalid:boolean;
    public errors:any;
    public handleInputChange;
    public constructor() {
        this.handleInputChange = this._handleInputChange.bind(this);
    }
    public setValue(value:any) {
        this.value = value;
    }
    private _handleInputChange(event, this_) {
        const target = event.target;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        this.value = value;
        this_.forceUpdate();
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
        this.controls = controls;
        this.invalid = false; // valid
    }
    public controls: any;
    public invalid: boolean;

    public get(key:string) : AbstractControl {
        return this.controls[key];
    }
}

