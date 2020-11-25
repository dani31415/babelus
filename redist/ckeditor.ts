import React from 'react';

export class ChangeEvent {
    public editor:any;
}

class CkEditorProperties {
    public editor?:any;
    public config?:any;
    public data?:any;
    public change?:any;
}

export class CkEditor extends React.Component<CkEditorProperties> {
    constructor(props: CkEditorProperties) {
        super(props);
    }
    render() {
        return null;
    }
}
