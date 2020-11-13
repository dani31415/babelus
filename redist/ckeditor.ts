import React from 'react';

export class ChangeEvent {
    public editor:any;
}

class CkEditorProperties {
    public editor?:any;
    public config?:any;
    public data?:any;
}

export class CkEditor extends React.Component<CkEditorProperties> {
    constructor(props: CkEditorProperties) {
        super(props);
    }
}
